"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  buildKey,
  decode,
  type SchemeId,
  SCHEMES,
} from "@/lib/bookCipher";
import { CIPHER_1, PRESET_KEYS } from "@/lib/ciphers";
import {
  groupForDisplay,
  looksPromising,
  scorePlaintext,
  type Scorecard,
} from "@/lib/scoring";

type DecodeView = {
  text: string;
  missing: number;
  coverage: number;
  keyLength: number;
  score: Scorecard;
};

function ScoreGrid({
  score,
  coverage,
  keyLength,
  baseline,
}: {
  score: Scorecard;
  coverage: number;
  keyLength: number;
  baseline?: number;
}) {
  const items = [
    {
      label: "English score",
      value: score.englishScore.toFixed(1),
      hint: baseline
        ? `Paper 2 baseline ${baseline.toFixed(1)}`
        : "Higher is more like English",
    },
    {
      label: "Chi² vs English",
      value: Number.isFinite(score.chiSquared)
        ? score.chiSquared.toFixed(1)
        : "∞",
      hint: "Lower is better. Random text sits around 150–400 here.",
    },
    {
      label: "Index of coincidence",
      value: score.ioc.toFixed(3),
      hint: "English ≈ 0.066; random ≈ 0.038",
    },
    {
      label: "Dictionary coverage",
      value: `${Math.round(score.wordCoverage * 100)}%`,
      hint: `${score.uniqueWords} distinct common words`,
    },
    {
      label: "Key coverage",
      value: `${Math.round(coverage * 100)}%`,
      hint: `${keyLength.toLocaleString()} symbols in the key`,
    },
    {
      label: "Alphabet run",
      value: String(score.longestMonoRun.length),
      hint: score.longestMonoRun.length
        ? score.longestMonoRun.text.toUpperCase()
        : "none",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border/80 bg-card/80 px-3 py-2"
        >
          <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="font-heading text-xl font-medium">{item.value}</dd>
          <p className="text-xs text-muted-foreground">{item.hint}</p>
        </div>
      ))}
    </dl>
  );
}

function HighlightedStream({
  text,
  start,
  length,
}: {
  text: string;
  start: number;
  length: number;
}) {
  if (length < 8) {
    return (
      <p className="font-mono text-[13px] leading-6 break-all">
        {groupForDisplay(text)}
      </p>
    );
  }
  const before = text.slice(0, start);
  const mid = text.slice(start, start + length);
  const after = text.slice(start + length);
  return (
    <p className="font-mono text-[13px] leading-6 break-all">
      {groupForDisplay(before)}
      {before && " "}
      <mark className="rounded-sm bg-[var(--highlight)] px-0.5 text-foreground">
        {groupForDisplay(mid)}
      </mark>{" "}
      {groupForDisplay(after)}
    </p>
  );
}

export function Workbench({
  paper2Score,
}: {
  paper2Score: number;
}) {
  const [preset, setPreset] = useState<string>(PRESET_KEYS[0].id);
  const [scheme, setScheme] = useState<SchemeId>("word-initial");
  const [wrap, setWrap] = useState(false);
  const [custom, setCustom] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    fetch(`/keys/${preset}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${preset}`);
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setSource(text);
          setStatus("idle");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Load failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [preset]);

  const keyText = custom.trim() ? custom : source;

  const view: DecodeView | null = useMemo(() => {
    if (!keyText.trim()) return null;
    const key = buildKey(keyText, scheme);
    const result = decode(CIPHER_1, key, wrap);
    const score = scorePlaintext(result.text, 1 - result.coverage);
    return { ...result, score };
  }, [keyText, scheme, wrap]);

  const promising = view
    ? looksPromising(view.score, 1 - view.coverage)
    : false;
  const selectedMeta = PRESET_KEYS.find((item) => item.id === preset);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="block space-y-1.5">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            Key document
          </span>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            value={preset}
            onChange={(event) => {
              setPreset(event.target.value);
              setCustom("");
            }}
          >
            {PRESET_KEYS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {selectedMeta ? (
            <p className="text-sm text-muted-foreground">
              {selectedMeta.year}. {selectedMeta.why}
            </p>
          ) : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            Numbering
          </span>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            value={scheme}
            onChange={(event) => setScheme(event.target.value as SchemeId)}
          >
            {SCHEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            {SCHEMES.find((item) => item.id === scheme)?.blurb}
          </p>
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={wrap}
          onChange={(event) => setWrap(event.target.checked)}
        />
        <span>
          Wrap numbers modulo the key length. Use this only as a probe: Paper 2
          did not wrap.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Or paste another public-domain text
        </span>
        <Textarea
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Paste a document printed by 1822, or by 1885 if you are testing a hoax key. Empty means use the selected preset."
          className="min-h-32 bg-background font-mono text-sm"
        />
      </label>

      {status === "loading" && !custom ? (
        <p className="text-sm text-muted-foreground">Loading key document…</p>
      ) : null}
      {status === "error" && !custom ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {view ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {promising ? (
              <Badge>Worth a human reading</Badge>
            ) : (
              <Badge variant="outline">Not a break</Badge>
            )}
            {view.score.locationHits.length ? (
              <Badge variant="secondary">
                Lexicon: {view.score.locationHits.join(", ")}
              </Badge>
            ) : (
              <Badge variant="outline">No Bedford-area words</Badge>
            )}
            {view.score.englishScore + 8 < paper2Score ? (
              <Badge variant="outline">
                Weaker than the Paper 2 control
              </Badge>
            ) : (
              <Badge variant="secondary">Near the Paper 2 control</Badge>
            )}
          </div>

          <ScoreGrid
            score={view.score}
            coverage={view.coverage}
            keyLength={view.keyLength}
            baseline={paper2Score}
          />

          {view.score.notes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {view.score.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-xl border border-border bg-[var(--stream)] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-heading text-sm">
                Paper 1 under this key
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(view.text).catch(() => {})
                }
              >
                Copy stream
              </Button>
            </div>
            <HighlightedStream
              text={view.text}
              start={view.score.longestMonoRun.start}
              length={view.score.longestMonoRun.length}
            />
          </div>

          {view.score.wordHits.length ? (
            <p className="text-sm text-muted-foreground">
              Greedy dictionary hits:{" "}
              <span className="text-foreground">
                {view.score.wordHits.slice(0, 24).join(" · ")}
              </span>
              {view.score.wordHits.length > 24 ? " …" : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No dictionary words of three letters or more. That is the empty
              state for this key: either the numbering is wrong, or there is no
              English underneath.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Choose a document or paste a text to run Paper 1 against it.
        </p>
      )}
    </div>
  );
}
