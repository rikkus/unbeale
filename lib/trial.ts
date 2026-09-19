import { buildKey, decode, SCHEMES, type SchemeId } from "./bookCipher";
import { CIPHER_1, PRESET_KEYS } from "./ciphers";
import { scorePlaintext } from "./scoring";

export type KeyTrial = {
  textId: string;
  textLabel: string;
  schemeId: SchemeId;
  schemeLabel: string;
  englishScore: number;
  chiSquared: number;
  ioc: number;
  wordCoverage: number;
  decodedPreview: string;
};

export function trialKey(source: string, scheme: SchemeId): Omit<
  KeyTrial,
  "textId" | "textLabel" | "schemeId" | "schemeLabel"
> {
  const key = buildKey(source, scheme);
  const result = decode(CIPHER_1, key, false);
  const score = scorePlaintext(result.text, 1 - result.coverage);
  return {
    englishScore: score.englishScore,
    chiSquared: score.chiSquared,
    ioc: score.ioc,
    wordCoverage: score.wordCoverage,
    decodedPreview: result.text.slice(0, 50),
  };
}

export function trialsForText(
  source: string,
  textId: string,
  textLabel: string,
): KeyTrial[] {
  if (!source.trim()) return [];
  return SCHEMES.map((scheme) => ({
    textId,
    textLabel,
    schemeId: scheme.id,
    schemeLabel: scheme.label,
    ...trialKey(source, scheme.id),
  }));
}

export function trialsForPresets(keys: Record<string, string>): KeyTrial[] {
  return PRESET_KEYS.flatMap((preset) =>
    trialsForText(keys[preset.id] ?? "", preset.id, preset.label),
  );
}
