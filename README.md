# Paper Number One

A working plan — and a small workbench — for Beale cipher 1, the unsolved “location” paper from the 1885 *Beale Papers*.

Paper 2 (the inventory) can be read with a numbered Declaration of Independence. Paper 1 cannot. This repository reproduces that known break, shows James Gillogly’s 1980 alphabet run, and lets you test other book-cipher keys against Paper 1 with an English scorer calibrated on Paper 2.

This is cryptanalysis of a published puzzle. It is not a map you should follow with a shovel. The ground around the old Buford’s tavern site is private property.

## Run locally

```bash
npm install
npm test
npm run dev
```

Then open [http://127.0.0.1:4721](http://127.0.0.1:4721).

`npm test` checks that the pamphlet numbers are intact: Paper 2 still contains `gold`, and Paper 1 under the Declaration still contains Gillogly’s `ABFDEFGHIIJKLMMNOHPP`.

## GitHub Pages

The app is a static export (`output: "export"`). On GitHub, the workflow in `.github/workflows/pages.yml` builds `out/` and deploys it.

After the repository is on GitHub as a **public** repo:

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**
2. Push to `main` (or run the **Deploy GitHub Pages** workflow)
3. Browse to `https://<user>.github.io/<repo>/`

Local static preview after `npm run build`:

```bash
npx --yes serve out -p 4721
```

## What the plan is

1. **Calibrate** on Paper 2 so the scorer would have caught the real break.
2. **Describe** Paper 1 as a number stream (length 520, max 2,906, sparse reuse).
3. **Force** the Declaration onto Paper 1 and confront the alphabet run instead of ignoring it.
4. **Sweep** public-domain documents with several numbering rules (word initials, finals, letters, odd/even words, reversed words).
5. **Kill** lucky scores: both halves of the cipher must look like English, and the Gillogly run must be explained.
6. **Treat a hoax as a first-class outcome.** Gillogly, Joe Nickell, and later digit-base tests already lean that way.

A candidate counts as a break only if the whole 520-letter stream is grammatical English, another person can repeat it from the key and the numbering rule, and it is at least as English-like as Paper 2.

## Data

Numbers follow the Cipher Foundation transcription of the 1885 pamphlet (520 values in Paper 1). Gillogly’s table has 495; a real break should survive both. The Declaration word list is the pamphlet’s own numbered text.

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Analysis lives in `lib/`. Preset keys are public-domain texts in `public/keys/`.
