#!/usr/bin/env python3
"""Plaintext crib search against Beale Paper 1.

Slides probable location phrases through the number stream, keeps only
homophone-consistent placements, then spends the remaining time budget
combining cribs and extending them with dictionary words. Scoring counts
letters and words filled *outside* the crib spans so a placement of
"bedford" is not rewarded merely for containing "bedford".

Calibrates on Paper 2 first: a true crib at the known start must propagate.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import time
from collections import Counter, defaultdict
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
    "porter", "goose", "creek", "river", "road", "stone", "iron", "pots",
    "gold", "silver", "jewels", "miles", "mile", "north", "south", "east",
    "west", "tree", "oak", "pine", "rock", "hill", "ridge", "hollow",
    "spring", "branch", "field", "fence", "path", "woods", "farm", "church",
    "mill", "gap", "knoll", "deposit", "excavation", "surface", "ground",
    "locality", "tavern", "bufords",
]

PLACES = [
    "bedford", "buford", "bufords", "thevault", "thetavern", "theroad",
    "thecreek", "theriver", "theoak", "thepine", "thetree", "therock",
    "thehill", "theridge", "thegap", "themill", "thefarm", "thechurch",
    "thewoods", "themountain", "goosecreek", "otterpeaks", "porter",
    "lynchburg", "montvale", "bufordstavern", "bedfordcounty",
]

DIST = [
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "fifteen", "twenty", "thirty", "forty",
    "fifty", "sixty", "hundred", "aboutfour", "abouttwo", "aboutthree",
    "aboutfive", "aboutsix",
]

UNITS = ["miles", "mile", "feet", "yards", "paces"]
DIRS = ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"]

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
    """.split()
    words.update(w for w in extra if len(w) >= 3)
    return sorted(words, key=lambda w: (-len(w), w))


def generate_cribs(paper2_raw: str) -> list[str]:
    cribs: set[str] = set(PHRASES)
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
    for direction in DIRS:
        for place in PLACES:
            cribs.add(f"{direction}ofthe{place}")
            cribs.add(f"{direction}of{place}")
            cribs.add(f"to{the_prefix(place)}")
    for place in PLACES:
        cribs.add(f"fromthe{place}")
        cribs.add(f"atthe{place}")
        cribs.add(f"nearthe{place}")
        cribs.add(f"underthe{place}")
        cribs.add(f"behindthe{place}")
        cribs.add(f"inthe{place}")
    short_places = [p for p in PLACES if len(p) <= 12]
    for a in short_places:
        for b in short_places:
            if a != b:
                cribs.add(f"between{a}and{b}")
                cribs.add(f"from{a}to{b}")
    return sorted(
        {c for c in cribs if 5 <= len(c) <= 48 and c.isalpha()},
        key=lambda c: (-len(c), c),
    )


def the_prefix(place: str) -> str:
    return place if place.startswith("the") else f"the{place}"


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
        extra = 0
        end = start + length
        seen: set[int] = set()
        for i in range(start, end):
            num = self.cipher[i]
            if num in seen:
                continue
            seen.add(num)
            for pos in self.pos[num]:
                if pos < start or pos >= end:
                    extra += 1
        return extra

    def evaluate(self, table: dict[int, str], spans: list[tuple[int, int]], cribs: list[tuple[str, int]], mode: str) -> State:
        covered = [False] * self.n
        for a, b in spans:
            for i in range(a, b):
                covered[i] = True
        crib_nums: set[int] = set()
        for a, b in spans:
            for i in range(a, b):
                crib_nums.add(self.cipher[i])
        chars = []
        outside = []
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
                    # inherited prior letters: usable for words, not extra
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
        score = (
            extra
            + 12 * hit_letters
            + 40 * len(loc)
            + 80 * min(ioc / 0.066, 1.5)
            + 30 * math.exp(-min(chi, 800) / 120)
            - 0.15 * max(0, filled - extra)  # slight penalty for long self-crib
        )
        st = State(
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
        return st

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
) -> tuple[list[Hit], dict]:
    prior = prior or {}
    cheap: list[tuple[int, int, str, dict[int, str]]] = []
    tried = 0
    for crib in cribs:
        if time.time() > deadline:
            break
        length = len(crib)
        for start in range(0, engine.n - length + 1):
            tried += 1
            if tried & 4095 == 0 and time.time() > deadline:
                break
            table = engine.try_place(start, crib, prior or None)
            if table is None:
                continue
            extra = engine.extra_outside(start, length)
            if extra < 4 and length < 14:
                continue
            cheap.append((extra, start, crib, table))
    cheap.sort(key=lambda row: (row[0], len(row[2])), reverse=True)
    singles: list[State] = []
    seen: set[tuple] = set()
    for extra, start, crib, table in cheap:
        key = tuple(sorted(table.items()))
        if key in seen:
            continue
        seen.add(key)
        st = engine.evaluate(
            table, [(start, start + len(crib))], [(crib, start)], mode
        )
        singles.append(st)
        if len(singles) >= max(beam_width * 8, top_keep * 6, 240):
            break
    singles.sort(key=lambda s: (s.score, s.extra), reverse=True)
    hits = [engine.to_hit(st) for st in singles[:top_keep]]

    pair_pool = singles[: min(len(singles), 120)]
    pair_hits: list[Hit] = []
    for i, a in enumerate(pair_pool):
        if time.time() > deadline:
            break
        for b in pair_pool[i + 1 :]:
            table = merge_tables(a.table, b.table)
            if table is None:
                continue
            st = engine.evaluate(
                table, a.spans + b.spans, a.cribs + b.cribs, mode + "+pair"
            )
            pair_hits.append(engine.to_hit(st))
    hits = keep_top(hits + pair_hits, top_keep)

    # Beam: extend with more cribs / dictionary words until time runs out.
    beam: list[State] = singles[:beam_width]
    words = [w for w in extend_words if len(w) >= 5]
    depth = 0
    cap = beam_width * 6

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
            for crib in cribs[:120]:
                length = len(crib)
                step = 1 if length >= 14 else 3
                for start in range(0, engine.n - length + 1, step):
                    table = engine.try_place(start, crib, st.table)
                    if table is None or len(table) == len(st.table):
                        continue
                    child = engine.evaluate(
                        table,
                        st.spans + [(start, start + length)],
                        st.cribs + [(crib, start)],
                        mode + f"+d{depth}",
                    )
                    consider(pool, seen_next, child, seq)
            for word in words:
                length = len(word)
                step = 1 if length >= 8 else 2
                for start in range(0, engine.n - length + 1, step):
                    first_n = engine.cipher[start]
                    have = st.table.get(first_n)
                    if have is not None and have != word[0]:
                        continue
                    table = engine.try_place(start, word, st.table)
                    if table is None or len(table) == len(st.table):
                        continue
                    child = engine.evaluate(
                        table,
                        st.spans + [(start, start + length)],
                        st.cribs + [(word, start)],
                        mode + f"+w{depth}",
                    )
                    consider(pool, seen_next, child, seq)
        if not pool:
            break
        pool.sort(key=lambda item: (item[0], item[1]), reverse=True)
        beam = [item[3] for item in pool[:beam_width]]
        for st in beam:
            hits.append(engine.to_hit(st))
        hits = keep_top(hits, top_keep)
    return hits, {"singlesTried": tried, "validSingles": len(singles), "beamDepth": depth}


def merge_tables(a: dict[int, str], b: dict[int, str]) -> dict[int, str] | None:
    out = dict(a)
    for num, ch in b.items():
        prev = out.get(num)
        if prev is not None and prev != ch:
            return None
        out[num] = ch
    return out


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
    parser.add_argument("--beam", type=int, default=48)
    parser.add_argument("--keep", type=int, default=40)
    parser.add_argument("--max-depth", type=int, default=10)
    args = parser.parse_args()
    if args.quick:
        args.seconds = min(args.seconds, 8)
        args.beam = 8
        args.keep = 12

    t0 = time.time()
    deadline = t0 + args.seconds
    c1 = load_json("cipher1.json")
    c2 = load_json("cipher2.json")
    raw2 = doi_decode(c2)
    dictionary = build_dictionary()
    location = set(LOCATION)
    cribs = generate_cribs(raw2)
    if args.quick:
        cribs = cribs[:80]

    print(f"cribs {len(cribs)} dict {len(dictionary)} budget {args.seconds:.0f}s")
    cal = calibrate(c2, raw2, dictionary, location)
    print("calibration", json.dumps(cal))

    engine1 = CribEngine(c1, dictionary, location)
    p2_letters = raw2
    p2_map = paper2_table(c2, p2_letters)
    shared_prior = {n: p2_map[n] for n in set(c1) if n in p2_map}

    def write() -> None:
        payload = {
            "seconds": round(time.time() - t0, 2),
            "cribCount": len(cribs),
            "dictionarySize": len(dictionary),
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
        }
        OUT.write_text(json.dumps(payload, indent=2))
        print(f"checkpoint {OUT} at {payload['seconds']}s", flush=True)

    hits_free: list[Hit] = []
    hits_locked: list[Hit] = []
    hits_shuffle: list[Hit] = []
    stats_free: dict = {}
    stats_locked: dict = {}
    stats_shuffle: dict = {}
    write()

    remaining = lambda: max(0.0, deadline - time.time())
    slice1 = t0 + remaining() * 0.55
    hits_free, stats_free = run_search(
        engine1,
        cribs,
        mode="free",
        prior=None,
        deadline=min(deadline, slice1),
        beam_width=args.beam,
        top_keep=args.keep,
        extend_words=dictionary[:800],
        max_depth=args.max_depth,
    )
    print(f"free search {stats_free} top {hits_free[0].score if hits_free else None}", flush=True)
    write()

    slice2 = time.time() + remaining() * 0.7
    hits_locked, stats_locked = run_search(
        engine1,
        cribs,
        mode="paper2-prior",
        prior=shared_prior,
        deadline=min(deadline, slice2),
        beam_width=max(8, args.beam // 2),
        top_keep=args.keep,
        extend_words=dictionary[:500],
        max_depth=args.max_depth,
    )
    print(f"locked search {stats_locked} top {hits_locked[0].score if hits_locked else None}", flush=True)
    write()

    rng = random.Random(1885)
    shuffled = list(c1)
    rng.shuffle(shuffled)
    engine_s = CribEngine(shuffled, dictionary, location)
    hits_shuffle, stats_shuffle = run_search(
        engine_s,
        cribs[:200] if not args.quick else cribs[:40],
        mode="shuffled",
        prior=None,
        deadline=deadline,
        beam_width=max(6, args.beam // 3),
        top_keep=max(8, args.keep // 2),
        extend_words=dictionary[:200],
        max_depth=args.max_depth,
    )
    print(f"shuffle search {stats_shuffle} top {hits_shuffle[0].score if hits_shuffle else None}", flush=True)
    write()
    print(f"wrote {OUT} in {time.time() - t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
