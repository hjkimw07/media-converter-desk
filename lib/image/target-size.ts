/**
 * 품질 탐색 기본 시도 횟수. 이진 탐색이라 6회면 1~100 범위를 약 2단계까지 좁힙니다.
 * 인코딩 1회가 수백 ms이므로 정확도보다 응답성을 우선한 값입니다.
 */
const DEFAULT_MAX_ATTEMPTS = 6;

export type QualitySearchInput = {
  /** 주어진 품질로 인코딩한 결과를 돌려주는 함수. 주입받아 인코더 구현과 분리합니다. */
  encode: (quality: number) => Promise<Blob>;
  targetBytes: number;
  minQuality: number;
  maxQuality: number;
  /** 총 인코딩 호출 상한. 기본 6회. */
  maxAttempts?: number;
};

export type QualitySearchResult = {
  blob: Blob;
  quality: number;
  attempts: number;
  /** false면 하한 품질에서도 목표 용량을 맞추지 못했다는 뜻입니다. */
  reachedTarget: boolean;
};

/**
 * 목표 용량 이하가 되는 가장 높은 품질을 이진 탐색으로 찾습니다.
 *
 * 목표를 만족하는 품질이 없으면 실패시키지 않고 **가장 작게 나온 결과**를
 * `reachedTarget: false`와 함께 돌려줍니다. 호출부는 이 값으로 사용자에게
 * "해상도를 줄이거나 목표를 높여야 한다"고 안내할 수 있습니다.
 *
 * @throws {RangeError} minQuality가 maxQuality보다 클 때
 */
export async function searchQualityForTargetSize({
  encode,
  targetBytes,
  minQuality,
  maxQuality,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: QualitySearchInput): Promise<QualitySearchResult> {
  if (minQuality > maxQuality) {
    throw new RangeError("minQuality must not be greater than maxQuality.");
  }

  // 달성 불가능한 목표에 탐색 비용을 쓰지 않습니다.
  if (targetBytes <= 0) {
    return { blob: await encode(minQuality), quality: minQuality, attempts: 1, reachedTarget: false };
  }

  const highest = await encode(maxQuality);
  let attempts = 1;

  if (highest.size <= targetBytes) {
    return { blob: highest, quality: maxQuality, attempts, reachedTarget: true };
  }

  let smallest = { blob: highest, quality: maxQuality };
  let best: { blob: Blob; quality: number } | undefined;
  let low = minQuality;
  let high = maxQuality - 1;

  while (low <= high && attempts < maxAttempts) {
    const quality = Math.floor((low + high) / 2);
    const blob = await encode(quality);
    attempts += 1;

    if (blob.size <= targetBytes) {
      best = { blob, quality };
      low = quality + 1;
      continue;
    }

    if (blob.size < smallest.blob.size) {
      smallest = { blob, quality };
    }

    high = quality - 1;
  }

  if (best) {
    return { blob: best.blob, quality: best.quality, attempts, reachedTarget: true };
  }

  // 목표를 만족한 품질이 하나도 없으면 하한 품질을 마지막으로 확인합니다.
  if (smallest.quality !== minQuality && attempts < maxAttempts) {
    const lowest = await encode(minQuality);
    attempts += 1;

    if (lowest.size < smallest.blob.size) {
      smallest = { blob: lowest, quality: minQuality };
    }
  }

  return {
    blob: smallest.blob,
    quality: smallest.quality,
    attempts,
    reachedTarget: smallest.blob.size <= targetBytes,
  };
}
