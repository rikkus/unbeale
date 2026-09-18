#!/usr/bin/env python3
"""Sanity checks for the Beale Paper 1 workbench data."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def first_letter(word: str) -> str:
    for ch in word:
        if ch.isalpha():
            return ch.lower()
    return "?"


def decode(cipher: list[int], key: list[str]) -> str:
    out = []
    for n in cipher:
        if n < 1 or n > len(key):
            out.append("?")
        else:
            out.append(key[n - 1])
    return "".join(out)


def main() -> None:
    c1 = json.loads((DATA / "cipher1.json").read_text())
    c2 = json.loads((DATA / "cipher2.json").read_text())
    c3 = json.loads((DATA / "cipher3.json").read_text())
    doi = json.loads((DATA / "doi_pamphlet.json").read_text())

    assert len(c1) == 520, len(c1)
    assert len(c2) == 763, len(c2)
    assert len(c3) == 618, len(c3)
    assert max(c1) == 2906
    assert c1[0] == 71 and c1[-1] == 760

    key = ["?"] * max(item["n"] for item in doi)
    for item in doi:
        key[item["n"] - 1] = first_letter(item["word"])
    assert len(key) == 1322
    assert key[114] == "i"  # 115 instituted

    paper2 = decode(c2, key)
    paper1 = decode(c1, key)

    assert "gold" in paper2, paper2[paper2.find("gol") : paper2.find("gol") + 20 if "gol" in paper2 else 20]
    assert "pound" in paper2
    assert paper2.startswith("i")
    assert paper1.count("?") == 10
    assert "abfdefghiijklmmnohpp" in paper1, paper1[180:210]
    assert "defghiijklmmno" in paper1

    table = {}
    for n, ch in zip(c2, paper2):
        if ch != "?":
            table[n] = ch
    crib = "".join(table.get(n, "?") for n in c1)
    assert "defghiijklm" in crib
    assert crib.count("?") == 242

    print("ok")
    print("  paper1", len(c1), "max", max(c1), "blanks", paper1.count("?"))
    print("  paper2 sample", paper2[:80])
    print("  gillogly", paper1[paper1.find("abfde") : paper1.find("abfde") + 20])


if __name__ == "__main__":
    main()
