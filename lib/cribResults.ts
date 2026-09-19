export type CribSpan = {
  text: string;
  start: number;
};

export type CribHitJson = {
  cribs: CribSpan[];
  filled: number;
  extra: number;
  outsideHits: string[];
  locationHits: string[];
  score: number;
  stream: string;
  mode: string;
};

export type CribResults = {
  seconds: number;
  cribCount: number;
  dictionarySize: number;
  calibration: {
    ok: boolean;
    crib?: string;
    filled?: number;
    extra?: number;
    score?: number;
    goldInRaw?: number;
    streamPreview?: string;
    outsideHits?: string[];
    reason?: string;
  };
  stats: Record<string, { singlesTried?: number; validSingles?: number; beamDepth?: number }>;
  paper1Free: CribHitJson[];
  paper1Paper2Prior: CribHitJson[];
  shuffledControl: CribHitJson[];
  bestFreeScore: number | null;
  bestShuffledScore: number | null;
};
