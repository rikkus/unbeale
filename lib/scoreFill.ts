/** Paper 2’s English score under the Declaration — opaque green. */
export const ENGLISH_OPAQUE = 93;

/** Paper 2 χ² under the Declaration. Lower is greener; this is fully opaque. */
export const CHI_OPAQUE = 97;

/** χ² typical of random letters in this scorer. Fully transparent. */
export const CHI_TRANSPARENT = 400;

/** English IoC. Opaque. Random ≈ 0.038 is transparent. */
export const IOC_OPAQUE = 0.066;
export const IOC_TRANSPARENT = 0.038;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function englishFill(score: number): number {
  return clamp01(score / ENGLISH_OPAQUE);
}

export function chiFill(chiSquared: number): number {
  if (!Number.isFinite(chiSquared)) return 0;
  return clamp01(
    (CHI_TRANSPARENT - chiSquared) / (CHI_TRANSPARENT - CHI_OPAQUE),
  );
}

export function iocFill(ioc: number): number {
  return clamp01((ioc - IOC_TRANSPARENT) / (IOC_OPAQUE - IOC_TRANSPARENT));
}

export function dictionaryFill(coverage: number): number {
  return clamp01(coverage);
}

export function greenFill(opacity: number): string {
  const alpha = clamp01(opacity);
  return `oklch(0.72 0.14 145 / ${alpha})`;
}
