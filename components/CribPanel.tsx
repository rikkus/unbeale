import type { CribResults } from "@/lib/cribResults";

function Stream({ text }: { text: string }) {
  return (
    <p className="font-mono text-[12px] leading-5 break-all text-muted-foreground">
      {text}
    </p>
  );
}

function HitTable({
  title,
  hits,
  empty,
}: {
  title: string;
  hits: CribResults["paper1Free"];
  empty: string;
}) {
  if (!hits.length) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <h3 className="font-heading text-lg">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="font-heading text-lg">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Cribs @ offset</th>
              <th className="px-3 py-2 font-medium">Filled</th>
              <th className="px-3 py-2 font-medium">Extra</th>
              <th className="px-3 py-2 font-medium">Outside words</th>
              <th className="px-3 py-2 font-medium">Decoded</th>
            </tr>
          </thead>
          <tbody>
            {hits.slice(0, 20).map((hit, index) => (
              <tr key={`${hit.mode}-${index}`} className="border-b border-border/60 align-top">
                <td className="px-3 py-2 font-mono tabular-nums">
                  {hit.score.toFixed(1)}
                </td>
                <td className="px-3 py-2">
                  {hit.cribs.map((c) => (
                    <div key={`${c.text}-${c.start}`}>
                      <span className="font-mono text-xs">{c.text}</span>{" "}
                      <span className="text-muted-foreground">@{c.start}</span>
                    </div>
                  ))}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">{hit.filled}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{hit.extra}</td>
                <td className="px-3 py-2 text-xs">
                  {hit.locationHits.length
                    ? hit.locationHits.join(", ")
                    : hit.outsideHits.slice(0, 8).join(" · ") || "—"}
                </td>
                <td className="max-w-[22rem] px-3 py-2">
                  <Stream text={hit.stream} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CribPanel({ results }: { results: CribResults }) {
  const freeBest = results.bestFreeScore ?? 0;
  const shuffledBest = results.bestShuffledScore ?? 0;
  const noSignal = shuffledBest >= freeBest - 5;
  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          This is plaintext cribbing, not a key search. A probable English
          string is slid along Paper 1’s 520 numbers. A placement is kept only
          if it never forces the same number to two letters. Repeated numbers
          then fill extra positions; the score rewards those extra letters and
          any location words that appear <em>outside</em> the crib itself.
        </p>
        <p>
          The engine tries single phrases, then pairs, then a time-bounded beam
          that adds more cribs and dictionary words. A second pass locks the{" "}
          {results.calibration.ok ? "122" : ""} numbers Paper 1 shares with
          Paper 2 to the Declaration letters from the known break. A shuffled
          Paper 1 is the noise floor: if it scores as well as the real list,
          the “hits” are reuse artifacts, not a message.
        </p>
        <p>
          Last run: {results.seconds.toFixed(0)}s, {results.cribCount} cribs,{" "}
          {results.dictionarySize} scoring words. Re-run locally with{" "}
          <code className="font-mono text-xs">npm run crib</code> (default one
          hour).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Paper 2 control extra letters
          </p>
          <p className="font-heading text-2xl">
            {results.calibration.ok ? results.calibration.extra : "fail"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Best Paper 1 score
          </p>
          <p className="font-heading text-2xl">{freeBest.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Shuffled control
          </p>
          <p className="font-heading text-2xl">{shuffledBest.toFixed(1)}</p>
        </div>
      </div>
      {noSignal ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6">
          The shuffled number list scores at least as well as the real Paper 1.
          Nothing in this crib pass is a decipherment; sparse reuse lets almost
          any long phrase sit down somewhere and paint extra letters that are
          not English.
        </p>
      ) : (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6">
          Paper 1 outscored a shuffled copy. Read the extra words: they still
          have to be a location sentence, not a lucky <span className="font-mono">road</span>.
        </p>
      )}
      <HitTable
        title="Unconstrained cribs"
        hits={results.paper1Free}
        empty="No homophone-consistent placement survived the filters."
      />
      <HitTable
        title="Locked to Paper 2’s shared numbers"
        hits={results.paper1Paper2Prior}
        empty="Every tried phrase conflicted with the Declaration letters already attached to numbers Paper 2 used. That is expected if Paper 1 is not filled from the same book, or if the true plaintext is not in the crib list."
      />
      <HitTable
        title="Shuffled Paper 1 (noise floor)"
        hits={results.shuffledControl}
        empty="Shuffle produced no comparable hits."
      />
    </div>
  );
}
