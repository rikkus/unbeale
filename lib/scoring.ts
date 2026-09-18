import { DICTIONARY, LOCATION_SET } from "./dictionary";

const ENGLISH_FREQ: Record<string, number> = {
  a: 0.08167,
  b: 0.01492,
  c: 0.02782,
  d: 0.04253,
  e: 0.12702,
  f: 0.02228,
  g: 0.02015,
  h: 0.06094,
  i: 0.06966,
  j: 0.00153,
  k: 0.00772,
  l: 0.04025,
  m: 0.02406,
  n: 0.06749,
  o: 0.07507,
  p: 0.01929,
  q: 0.00095,
  r: 0.05987,
  s: 0.06327,
  t: 0.09056,
  u: 0.02758,
  v: 0.00978,
  w: 0.0236,
  x: 0.0015,
  y: 0.01974,
  z: 0.00074,
};

export type MonoRun = {
  start: number;
  length: number;
  text: string;
};

export type Scorecard = {
  letters: number;
  chiSquared: number;
  ioc: number;
  vowelRatio: number;
  wordHits: string[];
  uniqueWords: number;
  wordCoverage: number;
  locationHits: string[];
  longestMonoRun: MonoRun;
  englishScore: number;
  notes: string[];
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export function lettersOnly(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

export function chiSquared(text: string): number {
  const letters = lettersOnly(text);
  if (letters.length === 0) return Number.POSITIVE_INFINITY;
  const counts = new Array(26).fill(0);
  for (const ch of letters) counts[ch.charCodeAt(0) - 97] += 1;
  let sum = 0;
  for (let i = 0; i < 26; i += 1) {
    const expected = ENGLISH_FREQ[String.fromCharCode(97 + i)] * letters.length;
    const diff = counts[i] - expected;
    sum += (diff * diff) / (expected || 1);
  }
  return sum;
}

export function indexOfCoincidence(text: string): number {
  const letters = lettersOnly(text);
  const n = letters.length;
  if (n < 2) return 0;
  const counts = new Array(26).fill(0);
  for (const ch of letters) counts[ch.charCodeAt(0) - 97] += 1;
  let sum = 0;
  for (const count of counts) sum += count * (count - 1);
  return sum / (n * (n - 1));
}

export function vowelRatio(text: string): number {
  const letters = lettersOnly(text);
  if (!letters) return 0;
  let vowels = 0;
  for (const ch of letters) if (VOWELS.has(ch)) vowels += 1;
  return vowels / letters.length;
}

export function longestMonotonicRun(text: string): MonoRun {
  const letters = text.toLowerCase();
  let best: MonoRun = { start: 0, length: 0, text: "" };
  let start = -1;
  let prev = "";
  for (let i = 0; i < letters.length; i += 1) {
    const ch = letters[i];
    if (ch < "a" || ch > "z") {
      start = -1;
      prev = "";
      continue;
    }
    if (start < 0) {
      start = i;
      prev = ch;
      continue;
    }
    const step = ch.charCodeAt(0) - prev.charCodeAt(0);
    if (step === 0 || step === 1) {
      prev = ch;
      const length = i - start + 1;
      if (length > best.length) {
        best = { start, length, text: letters.slice(start, i + 1) };
      }
    } else {
      start = i;
      prev = ch;
    }
  }
  return best;
}

export function findDictionaryHits(text: string): string[] {
  const compact = lettersOnly(text);
  const hits: string[] = [];
  let i = 0;
  while (i < compact.length) {
    let matched = "";
    for (const word of DICTIONARY) {
      if (compact.startsWith(word, i)) {
        matched = word;
        break;
      }
    }
    if (matched) {
      hits.push(matched);
      i += matched.length;
    } else {
      i += 1;
    }
  }
  return hits;
}

export function scorePlaintext(text: string, missingRate = 0): Scorecard {
  const letters = lettersOnly(text);
  const chi = chiSquared(text);
  const ioc = indexOfCoincidence(text);
  const vowels = vowelRatio(text);
  const hits = findDictionaryHits(text);
  const uniqueWords = new Set(hits).size;
  const coverage = letters.length === 0 ? 0 : hits.join("").length / letters.length;
  const locationHits = [...new Set(hits.filter((word) => LOCATION_SET.has(word)))];
  const run = longestMonotonicRun(text);
  const notes: string[] = [];

  if (run.length >= 10) {
    notes.push(
      `Alphabet-like run "${run.text.toUpperCase()}" (${run.length} letters). Treat as a hoax marker until explained.`,
    );
  }
  if (missingRate > 0.15) {
    notes.push(
      `${Math.round(missingRate * 100)}% of numbers fall outside this key. The document is too short, or the numbering is wrong.`,
    );
  }
  if (locationHits.length) {
    notes.push(`Location lexicon hits: ${locationHits.join(", ")}.`);
  }

  const englishScore =
    40 * Math.exp(-chi / 80) +
    25 * Math.min(ioc / 0.066, 1.4) +
    20 * coverage +
    8 * Math.min(locationHits.length, 4) +
    10 * (1 - missingRate) -
    Math.max(0, run.length - 6) * 1.5 +
    (vowels > 0.3 && vowels < 0.48 ? 4 : -2);

  return {
    letters: letters.length,
    chiSquared: chi,
    ioc,
    vowelRatio: vowels,
    wordHits: hits.slice(0, 80),
    uniqueWords,
    wordCoverage: coverage,
    locationHits,
    longestMonoRun: run,
    englishScore,
    notes,
  };
}

export function looksPromising(score: Scorecard, missingRate: number): boolean {
  return (
    missingRate < 0.05 &&
    score.englishScore >= 55 &&
    score.wordCoverage >= 0.35 &&
    score.longestMonoRun.length < 10 &&
    score.locationHits.length >= 1
  );
}

export function groupForDisplay(text: string, size = 5): string {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.join(" ");
}
