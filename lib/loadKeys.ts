import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRESET_KEYS } from "./ciphers";

export function loadPresetKeys(): Record<string, string> {
  const dir = join(process.cwd(), "data", "keys");
  const keys: Record<string, string> = {};
  for (const item of PRESET_KEYS) {
    keys[item.id] = readFileSync(join(dir, item.id), "utf8");
  }
  return keys;
}
