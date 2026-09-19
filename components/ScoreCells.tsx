import type { ReactNode } from "react";
import {
  chiFill,
  dictionaryFill,
  englishFill,
  greenFill,
  iocFill,
} from "@/lib/scoreFill";
import { cn } from "cn";

export function ScoreCell({
  opacity,
  children,
  className,
}: {
  opacity: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-2 py-2 text-right font-mono text-[13px] tabular-nums",
        className,
      )}
      style={{ backgroundColor: greenFill(opacity) }}
    >
      {children}
    </td>
  );
}

export function ScoreCells({
  englishScore,
  chiSquared,
  ioc,
  wordCoverage,
}: {
  englishScore: number;
  chiSquared: number;
  ioc: number;
  wordCoverage: number;
}) {
  return (
    <>
      <ScoreCell opacity={englishFill(englishScore)}>
        {Number.isFinite(englishScore) ? englishScore.toFixed(1) : "—"}
      </ScoreCell>
      <ScoreCell opacity={chiFill(chiSquared)}>
        {Number.isFinite(chiSquared) ? chiSquared.toFixed(1) : "∞"}
      </ScoreCell>
      <ScoreCell opacity={iocFill(ioc)}>{ioc.toFixed(3)}</ScoreCell>
      <ScoreCell opacity={dictionaryFill(wordCoverage)}>
        {Math.round(wordCoverage * 100)}%
      </ScoreCell>
    </>
  );
}

export function ScoreTableHead({ extra }: { extra?: ReactNode }) {
  return (
    <thead className="bg-card text-left text-[11px] tracking-wide text-muted-foreground uppercase">
      <tr className="border-b">
        {extra}
        <th className="px-2 py-2 font-medium">Numbering</th>
        <th className="px-2 py-2 text-right font-medium">English</th>
        <th className="px-2 py-2 text-right font-medium">Chi²</th>
        <th className="px-2 py-2 text-right font-medium">IoC</th>
        <th className="px-2 py-2 text-right font-medium">Dictionary</th>
        <th className="px-2 py-2 font-medium">Decoded (first 50)</th>
      </tr>
    </thead>
  );
}
