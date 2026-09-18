export const SCHEMES = [
  {
    id: "word-initial",
    label: "Word initials",
    blurb: "Number each word; take its first letter. This is how Paper 2 was read.",
  },
  {
    id: "word-final",
    label: "Word finals",
    blurb: "Number each word; take its last letter.",
  },
  {
    id: "word-second",
    label: "Second letters",
    blurb: "Number each word; take its second letter, skipping one-letter words.",
  },
  {
    id: "letters",
    label: "Every letter",
    blurb: "Number every alphabetic character in order. Helps short documents clear the 2,906 ceiling.",
  },
  {
    id: "odd-words",
    label: "Odd words only",
    blurb: "Skip even-numbered words. Suggested by some NSA-era notes on even/odd bias.",
  },
  {
    id: "even-words",
    label: "Even words only",
    blurb: "Skip odd-numbered words.",
  },
  {
    id: "words-reversed",
    label: "Words reversed",
    blurb: "Number words from the end of the document back to the start.",
  },
] as const;

export type SchemeId = (typeof SCHEMES)[number]["id"];

export type DecodeResult = {
  text: string;
  missing: number;
  coverage: number;
  keyLength: number;
};

export function tokenize(text: string): string[] {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
}

export function firstLetter(word: string): string {
  const match = word.match(/[A-Za-z]/);
  return match ? match[0].toLowerCase() : "?";
}

export function lastLetter(word: string): string {
  const letters = word.match(/[A-Za-z]/g);
  return letters ? letters[letters.length - 1].toLowerCase() : "?";
}

export function secondLetter(word: string): string {
  const letters = word.match(/[A-Za-z]/g);
  return letters && letters.length >= 2 ? letters[1].toLowerCase() : "?";
}

export function buildKey(text: string, scheme: SchemeId): string[] {
  const words = tokenize(text);
  switch (scheme) {
    case "word-initial":
      return words.map(firstLetter);
    case "word-final":
      return words.map(lastLetter);
    case "word-second":
      return words.map(secondLetter);
    case "letters":
      return text.toLowerCase().match(/[a-z]/g) ?? [];
    case "odd-words":
      return words.filter((_, index) => index % 2 === 0).map(firstLetter);
    case "even-words":
      return words.filter((_, index) => index % 2 === 1).map(firstLetter);
    case "words-reversed":
      return [...words].reverse().map(firstLetter);
    default:
      return words.map(firstLetter);
  }
}

export function decode(
  cipher: number[],
  key: string[],
  wrap = false,
): DecodeResult {
  const chars: string[] = [];
  let missing = 0;
  for (const n of cipher) {
    if (!Number.isFinite(n) || n < 1 || key.length === 0) {
      chars.push("?");
      missing += 1;
      continue;
    }
    const index = wrap ? (n - 1) % key.length : n - 1;
    if (index < 0 || index >= key.length) {
      chars.push("?");
      missing += 1;
    } else {
      chars.push(key[index]);
    }
  }
  return {
    text: chars.join(""),
    missing,
    coverage: cipher.length === 0 ? 0 : 1 - missing / cipher.length,
    keyLength: key.length,
  };
}

export function pamphletInitials(
  numbered: { n: number; word: string }[],
): string[] {
  const max = numbered.reduce((m, item) => Math.max(m, item.n), 0);
  const key = Array.from({ length: max }, () => "?");
  for (const item of numbered) {
    key[item.n - 1] = firstLetter(item.word);
  }
  return key;
}
