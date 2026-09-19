import { AboutBeale } from "@/components/AboutBeale";
import { ManualEntry } from "@/components/ManualEntry";
import { TextsTable } from "@/components/TextsTable";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  applyHomophones,
  buildKey,
  decode,
  homophoneTable,
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
import { scorePlaintext } from "@/lib/scoring";
import { chiSquaredUniform, cipherStats } from "@/lib/stats";
import { trialsForPresets } from "@/lib/trial";

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
  const textTrials = trialsForPresets(keys);
  const paper2AsBook = decode(
    CIPHER_1,
    buildKey(PAPER_2_PLAINTEXT, "word-initial"),
  );
  const paper2AsBookScore = scorePlaintext(
    paper2AsBook.text,
    1 - paper2AsBook.coverage,
  );
  const paper2AsLetters = decode(
    CIPHER_1,
    buildKey(PAPER_2_PLAINTEXT, "letters"),
  );
  const paper2AsLettersScore = scorePlaintext(
    paper2AsLetters.text,
    1 - paper2AsLetters.coverage,
  );
  const cribTable = homophoneTable(CIPHER_2, paper2.text);
  const crib = applyHomophones(CIPHER_1, cribTable.table);
  const cribScore = scorePlaintext(crib.text, 1 - crib.coverage);
  const cribRun = cribScore.longestMonoRun;

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
              Score every stored key, paste another, or read the attack plan.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="texts" className="gap-6">
          <TabsList className="flex h-11 w-full p-1">
            <TabsTrigger value="texts" className="px-3 py-2">
              Texts
            </TabsTrigger>
            <TabsTrigger value="manual" className="px-3 py-2">
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="about" className="px-3 py-2">
              About
            </TabsTrigger>
          </TabsList>
          <TabsContent value="texts" className="pt-2">
            <TextsTable rows={textTrials} />
          </TabsContent>
          <TabsContent value="manual" className="pt-2" keepMounted>
            <ManualEntry />
          </TabsContent>
          <TabsContent value="about" className="pt-2">
            <AboutBeale
              paper2={paper2}
              paper2Score={paper2Score}
              paper1={paper1}
              paper1Score={paper1Score}
              stats={stats}
              lastDigitChi={[
                chiSquaredUniform(stats[0].stats.lastDigit),
                chiSquaredUniform(stats[1].stats.lastDigit),
                chiSquaredUniform(stats[2].stats.lastDigit),
              ]}
              gillogly={gillogly}
              paper2AsBook={paper2AsBook}
              paper2AsBookScore={paper2AsBookScore}
              paper2AsLetters={paper2AsLetters}
              paper2AsLettersScore={paper2AsLettersScore}
              cribTable={cribTable}
              crib={crib}
              cribScore={cribScore}
              cribRun={cribRun}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
