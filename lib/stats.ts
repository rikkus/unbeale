export type CipherStats = {
  count: number;
  unique: number;
  uniqueRatio: number;
  min: number;
  max: number;
  lastDigit: number[];
  repeatedBigrams: number;
  consecutivePairs: number;
  ascendingRuns5: number;
  maxReuse: number;
};

function lastDigit(n: number): number {
  return ((n % 10) + 10) % 10;
}

export function cipherStats(nums: number[]): CipherStats {
  const unique = new Set(nums);
  const last = new Array(10).fill(0);
  const reuse = new Map<number, number>();
  let consecutivePairs = 0;
  let repeatedBigrams = 0;
  const bigrams = new Map<string, number>();
  let run = 1;
  let ascendingRuns5 = 0;

  for (let i = 0; i < nums.length; i += 1) {
    last[lastDigit(nums[i])] += 1;
    reuse.set(nums[i], (reuse.get(nums[i]) ?? 0) + 1);
    if (i > 0) {
      if (nums[i] === nums[i - 1] + 1) consecutivePairs += 1;
      if (nums[i] > nums[i - 1]) {
        run += 1;
        if (run === 5) ascendingRuns5 += 1;
      } else {
        run = 1;
      }
      const gram = `${nums[i - 1]},${nums[i]}`;
      bigrams.set(gram, (bigrams.get(gram) ?? 0) + 1);
    }
  }
  for (const count of bigrams.values()) {
    if (count > 1) repeatedBigrams += 1;
  }

  return {
    count: nums.length,
    unique: unique.size,
    uniqueRatio: nums.length ? unique.size / nums.length : 0,
    min: nums.length ? Math.min(...nums) : 0,
    max: nums.length ? Math.max(...nums) : 0,
    lastDigit: last,
    repeatedBigrams,
    consecutivePairs,
    ascendingRuns5,
    maxReuse: reuse.size ? Math.max(...reuse.values()) : 0,
  };
}

export function chiSquaredUniform(counts: number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n) return 0;
  const expected = n / counts.length;
  return counts.reduce((sum, count) => {
    const diff = count - expected;
    return sum + (diff * diff) / expected;
  }, 0);
}
