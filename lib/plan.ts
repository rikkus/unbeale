export type Phase = {
  id: string;
  title: string;
  goal: string;
  steps: string[];
  doneWhen: string;
  stopIf: string;
};

export const HYPOTHESES = [
  {
    id: "H0",
    title: "There is no plaintext",
    detail:
      "Paper 1 was assembled to look like a book cipher. James Gillogly’s 1980 alphabet run, later digit-base tests, and the sales purpose of the 1885 pamphlet all fit this.",
  },
  {
    id: "H1",
    title: "Same method, different book",
    detail:
      "Each number is still the first letter of a numbered word, but the key is some other document with at least 2,906 words.",
  },
  {
    id: "H2",
    title: "Same Declaration, different numbering",
    detail:
      "The Declaration is the key, but words are taken even/odd, reversed, by letter, or from a different printed edition than Paper 2.",
  },
  {
    id: "H3",
    title: "A second layer sits on the Declaration",
    detail:
      "The Declaration produces an intermediate stream (including the alphabet run) that still has to be unscrambled.",
  },
  {
    id: "H4",
    title: "The 1885 typesetting is corrupt",
    detail:
      "Paper 2 already contains numbering errors. A few shifted numbers in Paper 1 would poison a real message.",
  },
] as const;

export const PHASES: Phase[] = [
  {
    id: "0",
    title: "Calibrate on the known break",
    goal: "Prove the engine would have caught Paper 2, so we do not later congratulate ourselves for noise.",
    steps: [
      "Lock the 1885 pamphlet transcription of all three number lists.",
      "Rebuild the Declaration word list as printed and numbered in the pamphlet.",
      "Decode Paper 2 and confirm the Bedford / Buford inventory is recoverable.",
      "Record the score of that decode as the true-positive baseline.",
      "Score shuffled Paper 2 numbers against the same key as a false-positive baseline.",
    ],
    doneWhen:
      "Paper 2 plus the Declaration outscores random keys by a wide margin, and a human can read the inventory.",
    stopIf:
      "If we cannot reproduce Paper 2, the rest of the attack is measuring the wrong object.",
  },
  {
    id: "1",
    title: "Describe Paper 1 before decoding it",
    goal: "Know whether the number stream even looks like the book cipher used in Paper 2.",
    steps: [
      "Count length, unique numbers, maximum (2,906), and reuse.",
      "Compare repeated number-pairs with Paper 2. Real book ciphers reuse common words; a hoax often does not.",
      "Test last digits in base 10 versus other bases (Wase, 2020).",
      "Note that 10 numbers exceed the Declaration’s 1,322 words, so the Paper 2 key cannot be used unchanged.",
    ],
    doneWhen:
      "Paper 1 is summarized as a statistical object, not as a treasure map.",
    stopIf:
      "Nothing. This phase only decides how much weight to give H0 versus H1.",
  },
  {
    id: "2",
    title: "Force the Declaration onto Paper 1",
    goal: "Reproduce Gillogly and decide whether the alphabet run is a signature, a layer, or a slip.",
    steps: [
      "Decode Paper 1 with the same Declaration initials used for Paper 2, leaving out-of-range numbers as blanks.",
      "Isolate ABFDEFGHIIJKLMMNOHPP around positions 188–207.",
      "Test the two off-by-one numbers Gillogly flagged (195 vs 194, 301 vs 302).",
      "Ask whether the rest of the stream is English once that run is treated as nulls.",
      "Repeat with last letters, second letters, every letter, odd/even words, and reversed words.",
    ],
    doneWhen:
      "Either a second layer becomes readable, or the alphabet run remains an unexplained Declaration fingerprint.",
    stopIf:
      "If the alphabet run survives every honest numbering of the Declaration, H2 is in trouble and H0/H3 remain.",
  },
  {
    id: "3",
    title: "Sweep public documents Beale could have numbered",
    goal: "Test H1 on a corpus instead of on a favorite book.",
    steps: [
      "Restrict to texts in print by 1822, or by 1885 if we allow a pamphlet-era hoax.",
      "Keep any document with at least 2,906 words, or use letter numbering for shorter ones.",
      "For each text, try every numbering scheme in this workbench.",
      "Rank by English score, missing-number rate, and Bedford-area lexicon hits.",
      "Read only the top candidates. Do not mine the whole list for accidental words such as MORAL.",
    ],
    doneWhen:
      "Every preset key, plus any document you paste, has a score next to the Paper 2 baseline.",
    stopIf:
      "A candidate is interesting only if it is readable as English across the whole 520 letters, not in a 15-letter window.",
  },
  {
    id: "4",
    title: "Stress the survivors",
    goal: "Kill lucky scores.",
    steps: [
      "Split Paper 1 in half. A real key should make both halves look like English.",
      "Check that repeated numbers decode to the same letter.",
      "See whether the decode explains the Gillogly run rather than ignoring it.",
      "Compare style with Paper 2: same spelling habits, same 'ten hundred' voice.",
    ],
    doneWhen:
      "Any remaining candidate still reads as a location after these cuts.",
    stopIf:
      "If nothing survives, return to H0 rather than widening the corpus forever.",
  },
  {
    id: "5",
    title: "Treat the hoax hypothesis as a first-class result",
    goal: "A negative solution is still a solution if the evidence is strong.",
    steps: [
      "Keep Gillogly’s alphabet string on the table.",
      "Weigh Joe Nickell’s 1982 case that the pamphlet’s prose matches James B. Ward.",
      "Note that Paper 2 already tells you the treasure is four miles from Buford’s — so Paper 1 is oddly redundant if real, and useful advertising if not.",
      "Paper 3 is probably too short for thirty names and addresses, which is another fabrication tell.",
    ],
    doneWhen:
      "H0 is either accepted, or a surviving plaintext has explained the same facts better.",
    stopIf:
      "Do not 'solve' Paper 1 by pointing at a hillside. Cryptanalysis stops at words.",
  },
];

export const SUCCESS_TEST = [
  "The decode covers essentially every number in Paper 1, not a cherry-picked span.",
  "A second person can repeat it from the key and the numbering rule alone.",
  "The result is grammatical English, not a sprinkle of dictionary words in noise.",
  "It explains, or at least survives, the Gillogly alphabet run.",
  "It is at least as English-like as Paper 2 under the same scorer.",
];
