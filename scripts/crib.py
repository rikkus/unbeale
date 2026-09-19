#!/usr/bin/env python3
"""Plaintext crib search against Beale Paper 1.

Slides probable location phrases through the number stream, keeps only
homophone-consistent placements, then spends the remaining time budget
combining those placements (pairs, triples, randomized greedy packs, and
a beam). Scoring counts letters and words filled *outside* the crib
spans so a placement of "bedford" is not rewarded merely for containing
"bedford".

Calibrates on Paper 2 first: a true crib at the known start must propagate.

The combination stages are the expensive part. A one-hour budget is the
default; more time mostly buys extra greedy rounds and a deeper beam.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import time
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from heapq import heappush, heappushpop
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "crib_results.json"

WORD_RE = re.compile(r"[A-Za-z]+(?:['’`][A-Za-z]+)?")

LOCATION = [
    "bedford", "buford", "bufords", "montvale", "lynchburg", "virginia",
    "county", "vault", "cave", "tavern", "mountain", "peaks", "otter",
    "porter", "porters", "goose", "creek", "river", "road", "stone", "iron",
    "pots", "gold", "silver", "jewels", "miles", "mile", "north", "south",
    "east", "west", "tree", "oak", "pine", "rock", "hill", "ridge", "hollow",
    "spring", "branch", "field", "fence", "path", "woods", "farm", "church",
    "mill", "gap", "knoll", "deposit", "excavation", "surface", "ground",
    "locality", "liberty", "forest", "staunton", "roanoke", "campbell",
    "botetourt", "pebble", "flint", "buffalo", "orchard", "meadow",
    "pasture", "ford", "bridge", "corner", "survey", "bearing", "chain",
    "chains", "rods", "poles", "perches", "links", "whiteoak", "redoake",
    "poplar", "walnut", "locust", "hickory", "sycamore", "chestnut",
    "thicket", "ravine", "valley", "bluff", "ledge", "boulder",
]

PLACES = [
    "bedford", "buford", "bufords", "thevault", "thetavern", "theroad",
    "thecreek", "theriver", "theoak", "thepine", "thetree", "therock",
    "thehill", "theridge", "thegap", "themill", "thefarm", "thechurch",
    "thewoods", "themountain", "goosecreek", "otterpeaks", "porter",
    "porters", "lynchburg", "montvale", "bufordstavern", "bedfordcounty",
    "jamesriver", "blueridge", "peaktop", "flattop", "millpond",
    "millcreek", "ottercreek", "portersmountain", "whiteoak", "thecave",
    "thebridge", "theford", "theorchard", "themeadow", "thespring",
    "thehollow", "theknoll", "liberty", "newlondon", "campbellcounty",
    "themeetinghouse", "theschoolhouse", "thegraveyard", "thefence",
    "leftfork", "rightfork", "northfork", "southfork",
]

DIST = [
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen", "twenty", "twentyfive", "thirty",
    "thirtyfive", "forty", "fortyfive", "fifty", "sixty", "seventy",
    "eighty", "ninety", "hundred", "onehundred", "twohundred", "threehundred",
    "fourhundred", "fivehundred", "thousand", "aboutfour", "abouttwo",
    "aboutthree", "aboutfive", "aboutsix", "abouteight", "aboutten",
    "half", "quarter", "onehalf", "oneandahalf", "threequarters",
]

UNITS = [
    "miles", "mile", "feet", "foot", "yards", "paces", "rods", "chains",
    "poles", "perches",
]

DIRS = [
    "north", "south", "east", "west", "northeast", "northwest",
    "southeast", "southwest",
]

PAPER2_CLEAN = """
I have deposited in the county of Bedford, about four miles from Buford's,
in an excavation or vault, six feet below the surface of the ground, the
following articles, belonging jointly to the parties whose names are given
in number three, herewith. The first deposit consisted of ten hundred and
fourteen pounds of gold, and thirty-eight hundred and twelve pounds of
silver, deposited Nov. eighteen nineteen. The second was made Dec. eighteen
twenty-one, and consisted of nineteen hundred and seven pounds of gold, and
twelve hundred and eighty-eight of silver; also jewels, obtained in St. Louis
in exchange to save transportation, and valued at thirteen thousand dollars.
The above is securely packed in iron pots, with iron covers. The vault is
roughly lined with stone, and the vessels rest on solid stone, and are
covered with others. Paper number one describes the exact locality of the
vault, so that no difficulty will be had in finding it.
"""

PHRASES = [
    "inthecountyofbedford",
    "countyofbedford",
    "bedfordcounty",
    "bedfordcountyvirginia",
    "aboutfourmilesfrombuford",
    "aboutfourmilesfrombufords",
    "fourmilesfrombuford",
    "fourmilesfrombufords",
    "fourmilesfrombufordstavern",
    "frombufordstavern",
    "bufordstavern",
    "inanexcavationorvault",
    "excavationorvault",
    "sixfeetbelowthesurface",
    "sixfeetbelowthesurfaceoftheground",
    "belowthesurfaceoftheground",
    "belowthesurface",
    "theexactlocalityofthevault",
    "exactlocalityofthevault",
    "localityofthevault",
    "papernumberonedescribes",
    "papernumberone",
    "sothatnodifficultywillbehadinfindingit",
    "nodifficultywillbehadinfindingit",
    "inthecountyof",
    "thevaultis",
    "thevaultisroughlylinedwithstone",
    "linedwithstone",
    "restonsolidstone",
    "duenorth",
    "duesouth",
    "dueeast",
    "duewest",
    "thencealong",
    "inalinewith",
    "atthefootof",
    "atthebaseof",
    "onthewestside",
    "ontheeastside",
    "onthenorthside",
    "onthesouthside",
    "betweenthetwo",
    "fromtheroad",
    "fromthecreek",
    "nearthe",
    "closetothe",
    "underthe",
    "behindthe",
    "infrontofthe",
    "totheleft",
    "totheright",
    "onehundred",
    "twohundred",
    "threehundred",
    "fivehundred",
    "tenthousand",
    "inacavenearbufordstavern",
    "cavenearbufords",
    "nearbufordstavern",
    "inthecountyofbedfordwhich",
    "stoppingatbufords",
    "selectedabetterplace",
    "thetreasurewassafelytransferred",
    "caveunfitforourpurpose",
    "toofrequentlyvisited",
    "neighboringfarmers",
    "beginningatas",
    "beginningatastone",
    "beginningatawhiteoak",
    "beginningataredoak",
    "beginningatapine",
    "toawhiteoak",
    "toaredoak",
    "toapine",
    "toastone",
    "toarock",
    "toastake",
    "markedtree",
    "markedwhiteoak",
    "cornerofthe",
    "lineofthe",
    "thencewiththe",
    "crossingthecreek",
    "upthecreek",
    "downthecreek",
    "alongtheridge",
    "attheheadof",
    "atthemouthof",
    "onthewatersof",
    "inthevalleyof",
    "buriedunderthe",
    "concealedinthe",
    "hiddeninthe",
    "situatedabout",
    "locatedabout",
    "lyingabout",
    "distantabout",
    "measurednorth",
    "measuredsouth",
    "measuredeast",
    "measuredwest",
    "byacompass",
    "magneticnorth",
    "truenorth",
    "thespotis",
    "theplaceis",
    "thedepositis",
    "findthevault",
    "youwillfind",
    "youwillsee",
    "standsatthe",
    "standsnear",
    "betweenotterpeaks",
    "betweenthetwopeaks",
    "atthefootofotter",
    "westofbufords",
    "eastofbufords",
    "northofbufords",
    "southofbufords",
    "inthewoodsnear",
    "inafieldnear",
    "underaneast",
    "underawest",
    "twentyfeetbelow",
    "tenfeetbelow",
    "fourfeetbelow",
    "eightfeetbelow",
    "coveredwithstone",
    "coveredwithearth",
    "coveredwithleaves",
    "ironpots",
    "ironcovers",
    "solidrock",
    "flatrock",
    "largerock",
    "smallcave",
    "narrowravine",
    "steephill",
    "publicroad",
    "oldroad",
    "millroad",
    "countyroad",
    "stageroad",
    "turnpikeroad",
]


def letters_only(text: str) -> str:
    return "".join(ch.lower() for ch in text if "a" <= ch.lower() <= "z")


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in WORD_RE.finditer(text)]


def load_json(name: str):
    return json.loads((DATA / name).read_text())


def doi_decode(cipher: list[int]) -> str:
    doi = load_json("doi_pamphlet.json")
    key = ["?"] * max(item["n"] for item in doi)
    for item in doi:
        ch = next((c.lower() for c in item["word"] if c.isalpha()), "?")
        key[item["n"] - 1] = ch
    out = []
    for n in cipher:
        out.append(key[n - 1] if 1 <= n <= len(key) else "?")
    return "".join(out)


def the_prefix(place: str) -> str:
    return place if place.startswith("the") else f"the{place}"


def build_dictionary() -> list[str]:
    words = set(LOCATION)
    words.update(PLACES)
    words.update(DIST)
    words.update(UNITS)
    words.update(DIRS)
    extra = """
    the and for that with from this have deposited county about four miles
    excavation vault feet below surface ground following articles belonging
    jointly parties names given number three herewith first deposit consisted
    hundred fourteen pounds gold thirty eight twelve silver november eighteen
    nineteen second december twenty jewels obtained louis exchange save
    transportation valued thirteen thousand dollars above securely packed iron
    pots covers roughly lined stone vessels rest solid covered others paper
    describes exact locality difficulty finding buried treasure chest hole
    marked standing between oak pine fence line property corner survey chain
    compass degree bearing distance plantation farmhouse millpond crossing
    branch fork path woods thicket cave entrance buried under flat rock
    along from thence trees rocks house road mill creek river hill ridge
    county tavern vault locality paper number exact finding difficulty
    beginning white red stake magnetic true public stage turnpike distant
    situated located concealed hidden lying measure measured spot place
    """.split()
    words.update(w for w in extra if len(w) >= 3)
    narrative = DATA / "keys" / "beale_papers_narrative.txt"
    if narrative.exists():
        for w in tokenize(narrative.read_text()[:12000]):
            if 4 <= len(w) <= 14:
                words.add(w)
    for w in tokenize(PAPER2_CLEAN):
        if len(w) >= 3:
            words.add(w)
    return sorted(words, key=lambda w: (-len(w), w))


def paper2_ngrams() -> set[str]:
    clean = letters_only(PAPER2_CLEAN)
    out: set[str] = set()
    for length in (10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40):
        step = 1 if length <= 16 else 2
        for i in range(0, len(clean) - length + 1, step):
            out.add(clean[i : i + length])
    return out


def generate_cribs(_paper2_raw: str = "") -> list[str]:
    cribs: set[str] = set(PHRASES)
    cribs.update(paper2_ngrams())
    for word in LOCATION:
        if len(word) >= 5:
            cribs.add(word)
    for dist in DIST:
        for unit in UNITS:
            for place in PLACES:
                cribs.add(f"{dist}{unit}from{place}")
                cribs.add(f"{dist}{unit}{place}")
            for direction in DIRS:
                cribs.add(f"{dist}{unit}{direction}")
                cribs.add(f"{dist}{unit}{direction}of")
                cribs.add(f"thence{direction}{dist}{unit}")
    for dist in DIST[:14]:
        for unit in UNITS[:5]:
            for direction in DIRS:
                for place in PLACES[:22]:
                    cribs.add(f"{dist}{unit}{direction}ofthe{place}")
    for direction in DIRS:
        for place in PLACES:
            cribs.add(f"{direction}ofthe{place}")
            cribs.add(f"{direction}of{place}")
            cribs.add(f"due{direction}of{place}")
            cribs.add(f"to{the_prefix(place)}")
        cribs.add(f"bearing{direction}")
        cribs.add(f"thence{direction}")
    for place in PLACES:
        cribs.add(f"fromthe{place}")
        cribs.add(f"atthe{place}")
        cribs.add(f"nearthe{place}")
        cribs.add(f"underthe{place}")
        cribs.add(f"behindthe{place}")
        cribs.add(f"inthe{place}")
        cribs.add(f"inthecountyof{place}")
        cribs.add(f"{place}virginia")
        cribs.add(f"milesfrom{place}")
        cribs.add(f"beginningat{place}")
    short_places = [p for p in PLACES if len(p) <= 14]
    for a in short_places:
        for b in short_places:
            if a != b:
                cribs.add(f"between{a}and{b}")
                cribs.add(f"from{a}to{b}")
    return sorted(
        {c for c in cribs if 5 <= len(c) <= 48 and c.isalpha()},
        key=lambda c: (-len(c), c),
    )


@dataclass
class Hit:
    cribs: list[tuple[str, int]]
    filled: int
    extra: int
    outside_hits: list[str]
    location_hits: list[str]
    score: float
    stream: str
    mode: str

    def as_json(self) -> dict:
        return {
            "cribs": [{"text": t, "start": s} for t, s in self.cribs],
            "filled": self.filled,
            "extra": self.extra,
            "outsideHits": self.outside_hits[:24],
            "locationHits": self.location_hits,
            "score": round(self.score, 2),
            "stream": self.stream,
            "mode": self.mode,
        }


@dataclass
class State:
    table: dict[int, str]
    spans: list[tuple[int, int]]
    cribs: list[tuple[str, int]]
    mode: str
    score: float = 0.0
    filled: int = 0
    extra: int = 0
    outside_hits: list[str] = field(default_factory=list)
    location_hits: list[str] = field(default_factory=list)
    stream: str = ""


@dataclass(slots=True)
class Placement:
    crib: str
    start: int
    extra: int
    items: tuple[tuple[int, str], ...]

    @property
    def end(self) -> int:
        return self.start + len(self.crib)


class CribEngine:
    def __init__(self, cipher: list[int], dictionary: list[str], location: set[str]):
        self.cipher = cipher
        self.n = len(cipher)
        self.dictionary = dictionary
        self.location = location
        self.counts = Counter(cipher)
        self.pos: dict[int, list[int]] = defaultdict(list)
        for i, num in enumerate(cipher):
            self.pos[num].append(i)
        self.max_n = max(cipher) if cipher else 0
        self.by_first: dict[str, list[str]] = defaultdict(list)
        for word in dictionary:
            self.by_first[word[0]].append(word)

    def try_place(
        self, start: int, crib: str, table: dict[int, str] | None = None
    ) -> dict[int, str] | None:
        if start < 0 or start + len(crib) > self.n:
            return None
        updates: dict[int, str] = {}
        for i, ch in enumerate(crib):
            num = self.cipher[start + i]
            prev = updates.get(num)
            if prev is None and table:
                prev = table.get(num)
            if prev is not None and prev != ch:
                return None
            updates[num] = ch
        if not table:
            return updates
        merged = dict(table)
        merged.update(updates)
        return merged

    def extra_outside(self, start: int, length: int) -> int:
        span = Counter(self.cipher[start : start + length])
        return sum(self.counts[num] - count for num, count in span.items())

    def evaluate(
        self,
        table: dict[int, str],
        spans: list[tuple[int, int]],
        cribs: list[tuple[str, int]],
        mode: str,
    ) -> State:
        covered = [False] * self.n
        span_sum = 0
        for a, b in spans:
            span_sum += b - a
            for i in range(a, b):
                covered[i] = True
        unique_cover = sum(1 for flag in covered if flag)
        overlap = span_sum - unique_cover
        crib_nums: set[int] = set()
        for a, b in spans:
            crib_nums.update(self.cipher[a:b])
        chars: list[str] = []
        outside: list[str] = []
        filled = 0
        extra = 0
        for i, num in enumerate(self.cipher):
            ch = table.get(num)
            if ch:
                chars.append(ch)
                filled += 1
                if covered[i]:
                    outside.append("?")
                elif num in crib_nums:
                    outside.append(ch)
                    extra += 1
                else:
                    outside.append(ch)
            else:
                chars.append("?")
                outside.append("?")
        stream = "".join(chars)
        hits = dict_hits_indexed("".join(outside), self.by_first)
        loc = [h for h in hits if h in self.location]
        letters = [ch for ch in chars if ch != "?"]
        ioc = index_of_coincidence(letters)
        chi = chi_squared(letters)
        hit_letters = sum(len(h) for h in hits)
        dupes = sum(n - 1 for n in Counter(t for t, _ in cribs).values() if n > 1)
        score = (
            extra
            + 12 * hit_letters
            + 40 * len(loc)
            + 80 * min(ioc / 0.066, 1.5)
            + 30 * math.exp(-min(chi, 800) / 120)
            - 0.15 * max(0, filled - extra)
            - 6 * overlap
            - 28 * dupes
        )
        return State(
            table=table,
            spans=spans,
            cribs=cribs,
            mode=mode,
            score=score,
            filled=filled,
            extra=extra,
            outside_hits=hits,
            location_hits=loc,
            stream=stream,
        )

    def cheap_stats(self, table: dict[int, str], spans: list[tuple[int, int]]):
        covered = [False] * self.n
        span_sum = 0
        for a, b in spans:
            span_sum += b - a
            for i in range(a, min(b, self.n)):
                covered[i] = True
        unique_cover = sum(1 for flag in covered if flag)
        overlap = span_sum - unique_cover
        crib_nums: set[int] = set()
        for a, b in spans:
            crib_nums.update(self.cipher[a:b])
        extra = 0
        filled = 0
        letters: list[str] = []
        for i, num in enumerate(self.cipher):
            ch = table.get(num)
            if not ch:
                continue
            filled += 1
            letters.append(ch)
            if (not covered[i]) and num in crib_nums:
                extra += 1
        ioc = index_of_coincidence(letters)
        chi = chi_squared(letters)
        score = (
            extra
            + 80 * min(ioc / 0.066, 1.5)
            + 30 * math.exp(-min(chi, 800) / 120)
            - 0.15 * max(0, filled - extra)
            - 6 * overlap
        )
        return extra, filled, score

    def to_hit(self, st: State) -> Hit:
        return Hit(
            cribs=st.cribs,
            filled=st.filled,
            extra=st.extra,
            outside_hits=st.outside_hits,
            location_hits=st.location_hits,
            score=st.score,
            stream=st.stream,
            mode=st.mode,
        )


def dict_hits_indexed(text: str, by_first: dict[str, list[str]]) -> list[str]:
    hits: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == "?":
            i += 1
            continue
        matched = ""
        for word in by_first.get(ch, ()):
            if i + len(word) <= n and text.startswith(word, i):
                matched = word
                break
        if matched:
            hits.append(matched)
            i += len(matched)
        else:
            i += 1
    return hits


def index_of_coincidence(letters: list[str]) -> float:
    n = len(letters)
    if n < 2:
        return 0.0
    counts = Counter(letters)
    return sum(c * (c - 1) for c in counts.values()) / (n * (n - 1))


ENGLISH_FREQ = {
    "a": 0.08167, "b": 0.01492, "c": 0.02782, "d": 0.04253, "e": 0.12702,
    "f": 0.02228, "g": 0.02015, "h": 0.06094, "i": 0.06966, "j": 0.00153,
    "k": 0.00772, "l": 0.04025, "m": 0.02406, "n": 0.06749, "o": 0.07507,
    "p": 0.01929, "q": 0.00095, "r": 0.05987, "s": 0.06327, "t": 0.09056,
    "u": 0.02758, "v": 0.00978, "w": 0.0236, "x": 0.0015, "y": 0.01974,
    "z": 0.00074,
}


def chi_squared(letters: list[str]) -> float:
    n = len(letters)
    if n == 0:
        return 999.0
    counts = Counter(letters)
    total = 0.0
    for i in range(26):
        ch = chr(97 + i)
        expected = ENGLISH_FREQ[ch] * n
        diff = counts[ch] - expected
        total += (diff * diff) / (expected or 1)
    return total


def keep_top(hits: list[Hit], k: int) -> list[Hit]:
    hits.sort(key=lambda h: (h.score, h.extra, h.filled), reverse=True)
    return hits[:k]


def state_key(st: State) -> tuple:
    return tuple(sorted(st.table.items()))


def fits(table: dict[int, str], items: tuple[tuple[int, str], ...]) -> bool:
    new_info = False
    for num, ch in items:
        prev = table.get(num)
        if prev is None:
            new_info = True
        elif prev != ch:
            return False
    return new_info


def apply_items(table: dict[int, str], items: tuple[tuple[int, str], ...]) -> dict[int, str]:
    merged = dict(table)
    merged.update(items)
    return merged


def scan_chunk(payload: tuple) -> tuple[int, list[tuple[int, int, str, tuple]]]:
    cipher, cribs, prior_items, extra_short, extra_long = payload
    prior = dict(prior_items) if prior_items else None
    n = len(cipher)
    counts = Counter(cipher)
    out: list[tuple[int, int, str, tuple]] = []
    tried = 0
    for crib in cribs:
        length = len(crib)
        last = n - length
        for start in range(last + 1):
            tried += 1
            updates: dict[int, str] = {}
            ok = True
            for i, ch in enumerate(crib):
                num = cipher[start + i]
                prev = updates.get(num)
                if prev is None and prior is not None:
                    prev = prior.get(num)
                if prev is not None and prev != ch:
                    ok = False
                    break
                updates[num] = ch
            if not ok:
                continue
            span = Counter(cipher[start : start + length])
            extra = sum(counts[num] - count for num, count in span.items())
            if length < 16 and extra < extra_short:
                continue
            if length >= 16 and extra < extra_long:
                continue
            out.append((extra, start, crib, tuple(sorted(updates.items()))))
            if len(out) >= 24000:
                out.sort(key=lambda row: (row[0], len(row[2])), reverse=True)
                out = out[:12000]
    return tried, out


def enumerate_placements(
    cipher: list[int],
    cribs: list[str],
    prior: dict[int, str] | None,
    *,
    workers: int,
    extra_short: int = 3,
    extra_long: int = 2,
    cap: int = 20000,
) -> tuple[int, list[Placement]]:
    if not cribs:
        return 0, []
    prior_items = tuple(sorted((prior or {}).items()))
    if workers <= 1 or len(cribs) < 80:
        tried, raw = scan_chunk(
            (cipher, cribs, prior_items, extra_short, extra_long)
        )
        rows = raw
    else:
        chunks = [cribs[i::workers] for i in range(workers)]
        payloads = [
            (cipher, chunk, prior_items, extra_short, extra_long)
            for chunk in chunks
            if chunk
        ]
        tried = 0
        rows = []
        with ProcessPoolExecutor(max_workers=len(payloads)) as pool:
            futures = [pool.submit(scan_chunk, payload) for payload in payloads]
            for future in as_completed(futures):
                chunk_tried, chunk_rows = future.result()
                tried += chunk_tried
                rows.extend(chunk_rows)
                print(
                    f"  scan chunk +{chunk_tried} placements now {len(rows)}",
                    flush=True,
                )
    rows.sort(key=lambda row: (row[0], len(row[2])), reverse=True)
    if len(rows) > cap:
        rows = rows[:cap]
    placements = [
        Placement(crib=crib, start=start, extra=extra, items=items)
        for extra, start, crib, items in rows
    ]
    return tried, placements


def merge_tables(a: dict[int, str], b: dict[int, str]) -> dict[int, str] | None:
    out = dict(a)
    for num, ch in b.items():
        prev = out.get(num)
        if prev is not None and prev != ch:
            return None
        out[num] = ch
    return out


def hit_from_row(row: tuple) -> Hit:
    score, extra, filled, cribs, outside, loc, stream, mode = row
    return Hit(
        cribs=list(cribs),
        filled=filled,
        extra=extra,
        outside_hits=list(outside),
        location_hits=list(loc),
        score=score,
        stream=stream,
        mode=mode,
    )


def greedy_pack_rounds(payload: tuple) -> tuple[int, list[tuple]]:
    (
        cipher,
        dictionary,
        location,
        packed,
        prior_items,
        seed,
        n_rounds,
        max_depth,
        mode,
        top_keep,
        stop_at,
    ) = payload
    engine = CribEngine(cipher, dictionary, set(location))
    placements = [
        Placement(crib=c, start=s, extra=e, items=items)
        for c, s, e, items in packed
    ]
    prior = dict(prior_items)
    rng = random.Random(seed)
    best: list[Hit] = []
    kept = 0
    worst = -1e18
    round_i = 0
    while True:
        if stop_at and time.time() >= stop_at:
            break
        if n_rounds and round_i >= n_rounds:
            break
        if not stop_at and not n_rounds:
            break
        round_i += 1
        order = placements[:]
        rng.shuffle(order)
        table = dict(prior)
        spans: list[tuple[int, int]] = []
        placed: list[tuple[str, int]] = []
        used: set[tuple[str, int]] = set()
        for placement in order:
            if len(placed) >= max_depth:
                break
            key = (placement.crib, placement.start)
            if key in used:
                continue
            if not fits(table, placement.items):
                continue
            table.update(placement.items)
            spans.append((placement.start, placement.end))
            placed.append(key)
            used.add(key)
        if len(placed) < 2:
            continue
        st = engine.evaluate(table, spans, placed, mode + "+greedy")
        kept += 1
        if len(best) < top_keep or st.score > worst:
            best.append(engine.to_hit(st))
            if len(best) > top_keep * 3:
                best = keep_top(best, top_keep)
                worst = best[-1].score if best else -1e18
    return kept, [
        (
            h.score,
            h.extra,
            h.filled,
            h.cribs,
            h.outside_hits,
            h.location_hits,
            h.stream,
            h.mode,
        )
        for h in keep_top(best, top_keep)
    ]


def run_search(
    engine: CribEngine,
    cribs: list[str],
    *,
    mode: str,
    prior: dict[int, str] | None,
    deadline: float,
    beam_width: int,
    top_keep: int,
    extend_words: list[str],
    max_depth: int = 10,
    workers: int = 1,
    greedy_rounds: int = 8000,
    extra_short: int = 3,
    extra_long: int = 2,
    on_checkpoint=None,
) -> tuple[list[Hit], dict]:
    prior = prior or {}
    print(f"{mode}: scanning {len(cribs)} cribs with {workers} workers", flush=True)
    tried, placements = enumerate_placements(
        engine.cipher,
        cribs,
        prior or None,
        workers=workers,
        extra_short=extra_short,
        extra_long=extra_long,
        cap=20000,
    )
    print(
        f"{mode}: kept {len(placements)} placements from {tried} slides",
        flush=True,
    )
    hits: list[Hit] = []
    singles: list[State] = []
    seen: set[tuple] = set()
    for placement in placements:
        table = dict(prior)
        table.update(placement.items)
        key = tuple(sorted(table.items()))
        if key in seen:
            continue
        seen.add(key)
        st = engine.evaluate(
            table,
            [(placement.start, placement.end)],
            [(placement.crib, placement.start)],
            mode,
        )
        singles.append(st)
        if len(singles) >= max(beam_width * 8, top_keep * 8, 320):
            break
    singles.sort(key=lambda s: (s.score, s.extra), reverse=True)
    hits.extend(engine.to_hit(st) for st in singles[:top_keep])
    best_single_extra = max((st.extra for st in singles), default=0)
    best_single_score = max((st.score for st in singles), default=0.0)

    pair_pool = singles[: min(len(singles), 280)]
    pair_hits: list[Hit] = []
    pair_states: list[State] = []
    pairs_tried = 0
    for i, a in enumerate(pair_pool):
        if time.time() > deadline:
            break
        for b in pair_pool[i + 1 :]:
            pairs_tried += 1
            table = merge_tables(a.table, b.table)
            if table is None:
                continue
            used = {(t, s) for t, s in a.cribs}
            if any((t, s) in used for t, s in b.cribs):
                continue
            st = engine.evaluate(
                table, a.spans + b.spans, a.cribs + b.cribs, mode + "+pair"
            )
            pair_hits.append(engine.to_hit(st))
            pair_states.append(st)
    pair_states.sort(key=lambda s: (s.score, s.extra), reverse=True)
    hits = keep_top(hits + pair_hits, top_keep)

    triples_tried = 0
    triple_hits: list[Hit] = []
    for a in pair_states[:40]:
        if time.time() > deadline:
            break
        for b in singles[:80]:
            triples_tried += 1
            table = merge_tables(a.table, b.table)
            if table is None:
                continue
            used = {(t, s) for t, s in a.cribs}
            if any((t, s) in used for t, s in b.cribs):
                continue
            st = engine.evaluate(
                table, a.spans + b.spans, a.cribs + b.cribs, mode + "+triple"
            )
            triple_hits.append(engine.to_hit(st))
    hits = keep_top(hits + triple_hits, top_keep)

    _ = greedy_rounds
    _ = extend_words
    beam: list[State] = (singles[:beam_width] + pair_states[: beam_width // 2])[
        :beam_width
    ]
    cap = beam_width * 6
    depth = 0
    beam_pool = placements[: min(len(placements), 4500)]

    def consider(
        pool: list[tuple[float, int, int, State]],
        seen_next: set[tuple],
        child: State,
        seq: list[int],
    ) -> None:
        key = state_key(child)
        if key in seen_next:
            return
        seen_next.add(key)
        seq[0] += 1
        item = (child.score, child.extra, seq[0], child)
        if len(pool) < cap:
            heappush(pool, item)
        elif item[0] > pool[0][0]:
            heappushpop(pool, item)

    while time.time() < deadline and beam and depth < max_depth:
        depth += 1
        pool: list[tuple[float, int, int, State]] = []
        seen_next: set[tuple] = set()
        seq = [0]
        for st in beam:
            if time.time() > deadline:
                break
            used = {(t, s) for t, s in st.cribs}
            for placement in beam_pool:
                if (placement.crib, placement.start) in used:
                    continue
                if not fits(st.table, placement.items):
                    continue
                table = apply_items(st.table, placement.items)
                extra, filled, cheap = engine.cheap_stats(
                    table, st.spans + [(placement.start, placement.end)]
                )
                dupes = sum(1 for t, _ in st.cribs if t == placement.crib)
                cheap -= 28 * dupes
                child = State(
                    table=table,
                    spans=st.spans + [(placement.start, placement.end)],
                    cribs=st.cribs + [(placement.crib, placement.start)],
                    mode=mode + f"+d{depth}",
                    score=cheap,
                    filled=filled,
                    extra=extra,
                )
                consider(pool, seen_next, child, seq)
        if not pool:
            break
        pool.sort(key=lambda item: (item[0], item[1]), reverse=True)
        beam = []
        for item in pool[:beam_width]:
            st = item[3]
            full = engine.evaluate(st.table, st.spans, st.cribs, st.mode)
            beam.append(full)
            hits.append(engine.to_hit(full))
        hits = keep_top(hits, top_keep)
        print(
            f"{mode}: beam depth {depth} best {hits[0].score:.1f} extras {hits[0].extra}",
            flush=True,
        )

    greedy_kept = 0
    pack_pool = placements[: min(len(placements), 1600)]
    packed = [
        (p.crib, p.start, p.extra, p.items) for p in pack_pool
    ]
    prior_items = tuple(sorted(prior.items()))
    location_list = list(engine.location)
    seed = 1885 + len(mode) + len(placements)
    last_report = time.time()

    def stats_now() -> dict:
        return {
            "singlesTried": tried,
            "validSingles": len(singles),
            "placementsKept": len(placements),
            "pairsTried": pairs_tried,
            "triplesTried": triples_tried,
            "greedyKept": greedy_kept,
            "beamDepth": depth,
            "bestSingleExtra": best_single_extra,
            "bestSingleScore": round(best_single_score, 2),
            "workers": workers,
        }

    def absorb(rows: list[tuple]) -> None:
        nonlocal hits
        hits.extend(hit_from_row(row) for row in rows)
        hits = keep_top(hits, top_keep)

    def maybe_checkpoint(force: bool = False) -> None:
        nonlocal last_report
        now = time.time()
        if on_checkpoint and (force or now - last_report >= 20):
            on_checkpoint(hits, stats_now())
            last_report = now

    def run_batch(n_workers: int, rounds: int, stop_at: float, pool) -> None:
        nonlocal seed, greedy_kept
        payloads = []
        for _ in range(max(1, n_workers)):
            seed += 1
            payloads.append(
                (
                    engine.cipher,
                    engine.dictionary,
                    location_list,
                    packed,
                    prior_items,
                    seed,
                    rounds,
                    max_depth,
                    mode,
                    top_keep,
                    stop_at,
                )
            )
        if pool is None or n_workers <= 1:
            for payload in payloads:
                kept, rows = greedy_pack_rounds(payload)
                greedy_kept += kept
                absorb(rows)
            return
        futures = [pool.submit(greedy_pack_rounds, payload) for payload in payloads]
        for future in as_completed(futures):
            kept, rows = future.result()
            greedy_kept += kept
            absorb(rows)

    pool = None
    try:
        if workers > 1 and (deadline - time.time()) > 2:
            pool = ProcessPoolExecutor(max_workers=workers)
        while time.time() < deadline and packed:
            remaining = deadline - time.time()
            if remaining < 0.05:
                break
            n_workers = workers if pool is not None and remaining > 1.5 else 1
            stop_at = min(deadline, time.time() + (2 if n_workers == 1 else 25))
            rounds = 0
            run_batch(n_workers, rounds, stop_at, pool if n_workers > 1 else None)
            if time.time() - last_report >= 15:
                best = hits[0].score if hits else 0.0
                print(
                    f"{mode}: greedy packs {greedy_kept} best {best:.1f}",
                    flush=True,
                )
            maybe_checkpoint()
    finally:
        if pool is not None:
            pool.shutdown(wait=True)

    maybe_checkpoint(force=True)
    hits = keep_top(hits, top_keep)
    stats = stats_now()
    return hits, stats


def paper2_table(cipher: list[int], letters: str) -> dict[int, str]:
    table: dict[int, str] = {}
    for n, ch in zip(cipher, letters):
        if ch == "?":
            continue
        table[n] = ch
    return table


def calibrate(c2: list[int], raw: str, dictionary: list[str], location: set[str]) -> dict:
    engine = CribEngine(c2, dictionary, location)
    crib = re.sub(r"[^a-z]", "", raw)[:32]
    table = engine.try_place(0, crib)
    if table is None:
        return {"ok": False, "reason": "true start crib conflicts with itself"}
    st = engine.evaluate(table, [(0, len(crib))], [(crib, 0)], "paper2-control")
    gold_at = raw.find("gold")
    return {
        "ok": True,
        "crib": crib,
        "filled": st.filled,
        "extra": st.extra,
        "score": round(st.score, 2),
        "goldInRaw": gold_at,
        "streamPreview": st.stream[:80],
        "outsideHits": st.outside_hits[:12],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=float, default=3600)
    parser.add_argument("--quick", action="store_true")
    parser.add_argument("--beam", type=int, default=64)
    parser.add_argument("--keep", type=int, default=50)
    parser.add_argument("--max-depth", type=int, default=10)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--greedy", type=int, default=12000)
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()
    workers = args.workers or min(4, os.cpu_count() or 1)
    if args.quick:
        args.seconds = min(args.seconds, 8)
        args.beam = 8
        args.keep = 12
        args.max_depth = 2
        args.greedy = 40
        workers = 1

    t0 = time.time()
    deadline = t0 + args.seconds
    c1 = load_json("cipher1.json")
    c2 = load_json("cipher2.json")
    raw2 = doi_decode(c2)
    dictionary = build_dictionary()
    location = set(LOCATION)
    cribs = generate_cribs(raw2)
    word_cribs = [w for w in dictionary if 6 <= len(w) <= 14]
    if args.quick:
        cribs = cribs[:80]
    else:
        merged = list(dict.fromkeys(cribs + word_cribs))
        cribs = sorted(merged, key=lambda c: (-len(c), c))

    print(
        f"cribs {len(cribs)} dict {len(dictionary)} workers {workers} "
        f"budget {args.seconds:.0f}s",
        flush=True,
    )
    cal = calibrate(c2, raw2, dictionary, location)
    print("calibration", json.dumps(cal), flush=True)

    engine1 = CribEngine(c1, dictionary, location)
    p2_map = paper2_table(c2, raw2)
    shared_prior = {n: p2_map[n] for n in set(c1) if n in p2_map}

    hits_free: list[Hit] = []
    hits_locked: list[Hit] = []
    hits_shuffle: list[Hit] = []
    stats_free: dict = {}
    stats_locked: dict = {}
    stats_shuffle: dict = {}

    def write() -> None:
        payload = {
            "seconds": round(time.time() - t0, 2),
            "cribCount": len(cribs),
            "dictionarySize": len(dictionary),
            "workers": workers,
            "maxDepth": args.max_depth,
            "calibration": cal,
            "stats": {
                "free": stats_free,
                "paper2Prior": stats_locked,
                "shuffled": stats_shuffle,
            },
            "paper1Free": [h.as_json() for h in hits_free],
            "paper1Paper2Prior": [h.as_json() for h in hits_locked],
            "shuffledControl": [h.as_json() for h in hits_shuffle],
            "bestFreeScore": hits_free[0].score if hits_free else None,
            "bestShuffledScore": hits_shuffle[0].score if hits_shuffle else None,
            "bestFreeSingleExtra": stats_free.get("bestSingleExtra"),
            "bestShuffledSingleExtra": stats_shuffle.get("bestSingleExtra"),
        }
        args.output.write_text(json.dumps(payload, indent=2))
        print(f"checkpoint {args.output} at {payload['seconds']}s", flush=True)

    write()

    def note_free(current: list[Hit], stats: dict) -> None:
        nonlocal hits_free, stats_free
        hits_free = current
        stats_free = stats
        write()

    def note_locked(current: list[Hit], stats: dict) -> None:
        nonlocal hits_locked, stats_locked
        hits_locked = current
        stats_locked = stats
        write()

    def note_shuffle(current: list[Hit], stats: dict) -> None:
        nonlocal hits_shuffle, stats_shuffle
        hits_shuffle = current
        stats_shuffle = stats
        write()

    remaining = lambda: max(0.0, deadline - time.time())
    # Finish the unconstrained search first (most of the budget), then give
    # the locked and shuffled controls the same depth cap on leftover time.
    slice_free = t0 + remaining() * 0.62
    hits_free, stats_free = run_search(
        engine1,
        cribs,
        mode="free",
        prior=None,
        deadline=min(deadline, slice_free),
        beam_width=args.beam,
        top_keep=args.keep,
        extend_words=dictionary[:400],
        max_depth=args.max_depth,
        workers=workers,
        greedy_rounds=args.greedy,
        extra_short=3,
        on_checkpoint=note_free,
    )
    print(
        f"free search {stats_free} top {hits_free[0].score if hits_free else None}",
        flush=True,
    )
    write()

    slice_locked = time.time() + remaining() * 0.55
    hits_locked, stats_locked = run_search(
        engine1,
        cribs,
        mode="paper2-prior",
        prior=shared_prior,
        deadline=min(deadline, slice_locked),
        beam_width=max(8, args.beam // 2),
        top_keep=args.keep,
        extend_words=dictionary[:300],
        max_depth=args.max_depth,
        workers=workers,
        greedy_rounds=max(200, args.greedy // 3),
        extra_short=0,
        extra_long=0,
        on_checkpoint=note_locked,
    )
    print(
        f"locked search {stats_locked} top {hits_locked[0].score if hits_locked else None}",
        flush=True,
    )
    write()

    rng = random.Random(1885)
    shuffled = list(c1)
    rng.shuffle(shuffled)
    engine_s = CribEngine(shuffled, dictionary, location)
    shuffle_cribs = cribs if not args.quick else cribs[:40]
    hits_shuffle, stats_shuffle = run_search(
        engine_s,
        shuffle_cribs,
        mode="shuffled",
        prior=None,
        deadline=deadline,
        beam_width=max(8, args.beam // 2),
        top_keep=max(8, args.keep // 2),
        extend_words=dictionary[:200],
        max_depth=args.max_depth,
        workers=workers,
        greedy_rounds=max(200, args.greedy // 3),
        extra_short=3,
        on_checkpoint=note_shuffle,
    )
    print(
        f"shuffle search {stats_shuffle} top {hits_shuffle[0].score if hits_shuffle else None}",
        flush=True,
    )
    write()
    print(f"wrote {args.output} in {time.time() - t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
