"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreCells, ScoreTableHead } from "@/components/ScoreCells";
import { Textarea } from "@/components/ui/textarea";
import { trialsForText, type KeyTrial } from "@/lib/trial";

const MIN_BUSY_MS = 1000;

export function ManualEntry() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<KeyTrial[]>([]);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const started = performance.now();
    const next = trialsForText(text, "manual", "Manual entry");
    const elapsed = performance.now() - started;
    const wait = Math.max(0, MIN_BUSY_MS - elapsed);
    const id = window.setTimeout(() => {
      setRows(next);
      setBusy(false);
    }, wait);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Paste or type a key document. Paper 1 is decoded with every numbering
        rule. The cells use the same green scale as the Texts tab.
      </p>
      <label className="block space-y-1.5">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Key text
        </span>
        <Textarea
          value={text}
          onChange={(event) => {
            setBusy(true);
            setText(event.target.value);
          }}
          placeholder="Paste a public-domain document. Empty means nothing to score."
          className="min-h-48 bg-background font-mono text-sm"
        />
      </label>
      <div
        aria-live="polite"
        aria-busy={busy}
        className="flex h-10 w-52 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/70 font-mono text-sm"
      >
        {busy ? "..." : "Processing complete"}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <ScoreTableHead />
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.schemeId}
                  className="border-b border-border/60"
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    {row.schemeLabel}
                  </td>
                  <ScoreCells
                    englishScore={row.englishScore}
                    chiSquared={row.chiSquared}
                    ioc={row.ioc}
                    wordCoverage={row.wordCoverage}
                  />
                  <td className="max-w-[18rem] px-2 py-2 font-mono text-[12px] leading-5 break-all">
                    {row.decodedPreview || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Type or paste a key to fill the score table.
        </p>
      )}
    </div>
  );
}
