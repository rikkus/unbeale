import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Workbench } from "@/components/Workbench";
import {
  decode,
  pamphletInitials,
} from "@/lib/bookCipher";
import {
  CIPHER_1,
  CIPHER_2,
  CIPHER_3,
  DOI_PAMPHLET,
  PAPER_2_PLAINTEXT,
} from "@/lib/ciphers";
import { loadPresetKeys } from "@/lib/loadKeys";
import { HYPOTHESES, PHASES, SUCCESS_TEST } from "@/lib/plan";
import { groupForDisplay, scorePlaintext } from "@/lib/scoring";
import { chiSquaredUniform, cipherStats } from "@/lib/stats";

function formatDecode(text: string): string {
  return groupForDisplay(text).toUpperCase();
}

export default function Home() {
  const doiKey = pamphletInitials(DOI_PAMPHLET);
  const paper2 = decode(CIPHER_2, doiKey);
  const paper1 = decode(CIPHER_1, doiKey);
  const paper2Score = scorePlaintext(paper2.text, 1 - paper2.coverage);
  const paper1Score = scorePlaintext(paper1.text, 1 - paper1.coverage);
  const stats = [
    { name: "Paper 1 · location", nums: CIPHER_1, status: "Unsolved" },
    { name: "Paper 2 · contents", nums: CIPHER_2, status: "Solved" },
    { name: "Paper 3 · names", nums: CIPHER_3, status: "Unsolved" },
  ].map((row) => ({ ...row, stats: cipherStats(row.nums) }));
  const gillogly = paper1Score.longestMonoRun;
  const keys = loadPresetKeys();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/70 bg-[var(--banner)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs tracking-[0.28em] text-[var(--seal)] uppercase">
            The Beale Papers · 1885 · Paper Number One
          </p>
          <div className="max-w-3xl space-y-4">
            <h1 className="font-heading text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl">
              A plan to try to read the unsolved location cipher
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Paper 2 can be read with the Declaration of Independence. Paper 1,
              which is supposed to give the exact spot of the vault, cannot.
              This workbench reproduces the known break, puts Gillogly’s
              alphabet run on the page, and tests other documents the way a
              cryptanalyst would — not the way a treasure hunter would.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <a className="underline-offset-4 hover:underline" href="#control">
              Known break
            </a>
            <a className="underline-offset-4 hover:underline" href="#gillogly">
              Alphabet run
            </a>
            <a className="underline-offset-4 hover:underline" href="#plan">
              Attack plan
            </a>
            <a className="underline-offset-4 hover:underline" href="#workbench">
              Try a key
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>What we are actually attacking</CardTitle>
              <CardDescription>
                Three number lists printed in Lynchburg in 1885. Only the
                inventory cipher has a generally accepted reading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-[15px] leading-7">
              <p>
                Thomas J. Beale is said to have buried gold, silver, and jewels
                four miles from Buford’s tavern in Bedford County, Virginia,
                around 1820, then left three homophonic book ciphers with
                innkeeper Robert Morriss. The story reaches us only through
                James B. Ward’s pamphlet. No independent copy of the ciphers
                exists.
              </p>
              <p>
                A book cipher of this kind replaces each plaintext letter with
                the number of a word in a key text that begins with that
                letter. Paper 2 used the Declaration. Paper 1’s largest number
                is 2,906, which is already past the Declaration’s 1,322 words,
                so the same key cannot be used in the same way.
              </p>
              <p className="text-muted-foreground">
                This is cryptanalysis of a published puzzle. It is not a warrant
                to dig. The land around the old Buford’s site is private, and
                the pamphlet itself warned readers not to ruin themselves
                chasing it.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The three papers</CardTitle>
              <CardDescription>
                Paper 2 reuses numbers the way a real book cipher does. Papers
                1 and 3 look leaner and more sequential.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 font-medium">Paper</th>
                      <th className="py-2 pr-3 font-medium">N</th>
                      <th className="py-2 pr-3 font-medium">Max</th>
                      <th className="py-2 pr-3 font-medium">Unique</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((row) => (
                      <tr key={row.name} className="border-b border-border/60">
                        <td className="py-2 pr-3">{row.name}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.stats.count}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.stats.max.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {Math.round(row.stats.uniqueRatio * 100)}%
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={
                              row.status === "Solved" ? "default" : "outline"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Last-digit χ² against a uniform 0–9 split: Paper 1{" "}
                {chiSquaredUniform(stats[0].stats.lastDigit).toFixed(1)}, Paper
                2 {chiSquaredUniform(stats[1].stats.lastDigit).toFixed(1)},
                Paper 3 {chiSquaredUniform(stats[2].stats.lastDigit).toFixed(1)}.
                All three prefer some digits in base 10. Paper 2 stays lumpy in
                other bases; the unsolved papers do not, which is one hoax
                argument.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="control" className="scroll-mt-8 space-y-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-[var(--seal)] uppercase">
              Phase 0
            </p>
            <h2 className="font-heading text-3xl">
              Control: the Declaration really does unlock Paper 2
            </h2>
          </div>
          <Card>
            <CardContent className="space-y-5 pt-6">
              <p className="leading-7">
                Using the pamphlet’s own numbered Declaration, Paper 2 comes
                back as the familiar inventory. The numbering in the 1885
                printing is sloppy, so a few letters are off — COUNTF for
                COUNTY, and similar Hammer errors — but the sentence is not in
                doubt. That messy-but-readable score is the bar Paper 1 has to
                beat.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Paper 2 English score
                  </p>
                  <p className="font-heading text-2xl">
                    {paper2Score.englishScore.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Dictionary coverage
                  </p>
                  <p className="font-heading text-2xl">
                    {Math.round(paper2Score.wordCoverage * 100)}%
                  </p>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Out-of-range numbers
                  </p>
                  <p className="font-heading text-2xl">{paper2.missing}</p>
                </div>
              </div>
              <blockquote className="border-l-2 border-[var(--seal)] pl-4 text-[15px] leading-7">
                {PAPER_2_PLAINTEXT}
              </blockquote>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Raw letter stream from the pamphlet Declaration
                </summary>
                <p className="mt-3 font-mono text-[13px] leading-6 break-all">
                  {formatDecode(paper2.text)}
                </p>
              </details>
            </CardContent>
          </Card>
        </section>

        <section id="gillogly" className="scroll-mt-8 space-y-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-[var(--seal)] uppercase">
              Phase 2
            </p>
            <h2 className="font-heading text-3xl">
              The same key stains Paper 1 with an alphabet
            </h2>
          </div>
          <Card>
            <CardContent className="space-y-5 pt-6">
              <p className="leading-7">
                Apply that Declaration to Paper 1 and you do not get a map. You
                get noise, ten blanks where the numbers exceed 1,322, and — at
                letters {gillogly.start + 1}–{gillogly.start + gillogly.length} —{" "}
                <span className="font-mono">
                  {gillogly.text.toUpperCase()}
                </span>
                . James J. Gillogly published the string in{" "}
                <em>Cryptologia</em> in 1980. The inner run DEFGHIIJKLMMNO is
                too orderly to treat as an accident, and two of the “wrong”
                letters sit one Declaration-word off a correct letter.
              </p>
              <div className="rounded-xl bg-[var(--stream)] p-4 font-mono text-[13px] leading-6 break-all">
                {formatDecode(paper1.text.slice(0, gillogly.start))}{" "}
                <mark className="rounded-sm bg-[var(--highlight)] px-0.5 text-foreground">
                  {formatDecode(gillogly.text)}
                </mark>{" "}
                {formatDecode(
                  paper1.text.slice(gillogly.start + gillogly.length),
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="text-sm leading-6">
                  Paper 1 English score under this key:{" "}
                  <strong>{paper1Score.englishScore.toFixed(1)}</strong>,
                  against Paper 2’s {paper2Score.englishScore.toFixed(1)}.
                  Chi² {paper1Score.chiSquared.toFixed(0)} versus{" "}
                  {paper2Score.chiSquared.toFixed(0)}. The stream also contains
                  the accidental word MORAL. That is exactly the kind of
                  island that has fooled people for a century. It is not a
                  decipherment.
                </p>
                <p className="text-sm leading-6">
                  Any serious theory of Paper 1 has to explain this run. Either
                  the Declaration was in the encoder’s hand while the numbers
                  were chosen (Gillogly’s hoax picture), or the run is a
                  leftover of a second encryption layer that nobody has
                  stripped.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="plan" className="scroll-mt-8 space-y-6">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.22em] text-[var(--seal)] uppercase">
              The plan
            </p>
            <h2 className="font-heading text-3xl">
              Five hypotheses, then a sequence that can kill them
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Do not start by hunting a hillside. Start by deciding what kind
              of object Paper 1 is. The workbench below is built to run
              phases 0–3. Phases 4 and 5 are judgment after the scores exist.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {HYPOTHESES.map((item) => (
              <Card key={item.id} size="sm">
                <CardHeader>
                  <Badge variant="outline">{item.id}</Badge>
                  <CardTitle className="mt-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </CardContent>
              </Card>
            ))}
          </div>
          <ol className="space-y-4">
            {PHASES.map((phase) => (
              <li
                key={phase.id}
                className="rounded-xl border border-border bg-card px-5 py-4"
              >
                <p className="text-xs tracking-wide text-[var(--seal)] uppercase">
                  Phase {phase.id}
                </p>
                <h3 className="font-heading text-xl">{phase.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {phase.goal}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {phase.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <Separator className="my-3" />
                <p className="text-sm">
                  <span className="font-medium">Done when: </span>
                  {phase.doneWhen}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Stop if: </span>
                  {phase.stopIf}
                </p>
              </li>
            ))}
          </ol>
          <Card>
            <CardHeader>
              <CardTitle>What would count as a break</CardTitle>
              <CardDescription>
                A tweet that says “solved” does not. These tests would.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                {SUCCESS_TEST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section id="workbench" className="scroll-mt-8 space-y-4">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.22em] text-[var(--seal)] uppercase">
              Phases 2–3
            </p>
            <h2 className="font-heading text-3xl">
              Run Paper 1 against a key
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Preset documents are public-domain texts someone in 1822 or 1885
              could have numbered. Paste anything else you want to test. The
              scorer is calibrated on Paper 2; if a result is not at least that
              readable, it is not a decipherment.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Workbench
                paper2Score={paper2Score.englishScore}
                keys={keys}
              />
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border border-dashed border-border px-5 py-6 text-sm leading-7 text-muted-foreground">
          <p>
            Sources for the plan: the 1885 Beale Papers; Carl Hammer on how
            Paper 2 was numbered; James J. Gillogly, “The Beale Cipher: A
            Dissenting Opinion,” <em>Cryptologia</em> 4 (1980); Joe Nickell,
            “Discovered: The Secret of Beale’s Treasure,”{" "}
            <em>Virginia Magazine of History and Biography</em> 90 (1982);
            Viktor Wase on last digits and base 10 (HistoCrypt 2020). The
            numbers here follow the Cipher Foundation’s transcription of the
            pamphlet (520 values in Paper 1). Gillogly’s 495-number table is a
            known variant; a real break should survive both.
          </p>
        </section>
      </main>
    </div>
  );
}
