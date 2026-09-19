import { ScoreCells, ScoreTableHead } from "@/components/ScoreCells";
import type { KeyTrial } from "@/lib/trial";

export function TextsTable({ rows }: { rows: KeyTrial[] }) {
  const groups = new Map<string, KeyTrial[]>();
  for (const row of rows) {
    const list = groups.get(row.textId) ?? [];
    list.push(row);
    groups.set(row.textId, list);
  }

  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Each stored key is run against Paper 1 with every numbering rule. The
        recovered stream is a <em>decoded</em> letter string (plaintext if the
        key is right), not “unenciphered” in the substitution-cipher sense.
        Green fill is opaque at the Paper 2 English bar (93) and at English-like
        IoC (0.066). Chi² is greener as it falls toward Paper 2’s ~97, paler as
        it rises toward random (~400). Dictionary coverage is opaque at 100%.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <ScoreTableHead
            extra={
              <th className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">
                Text
              </th>
            }
          />
          <tbody>
            {[...groups.values()].map((group) =>
              group.map((row, index) => (
                <tr
                  key={`${row.textId}-${row.schemeId}`}
                  className="border-b border-border/60"
                >
                  {index === 0 ? (
                    <th
                      scope="rowgroup"
                      rowSpan={group.length}
                      className="sticky left-0 z-10 max-w-[14rem] bg-card px-3 py-2 text-left align-top font-medium"
                    >
                      {row.textLabel}
                    </th>
                  ) : null}
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
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
