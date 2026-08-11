import { describe, expect, it, vi } from "vitest";
import { searchQualityForTargetSize } from "./target-size";

/**
 * 품질이 낮아질수록 결과가 작아지는 인코더를 흉내냅니다.
 * quality 100 -> 1000바이트, quality 10 -> 100바이트.
 */
function createFakeEncoder(bytesPerQuality = 10) {
  return vi.fn(async (quality: number) => new Blob([new Uint8Array(quality * bytesPerQuality)]));
}

describe("searchQualityForTargetSize", () => {
  it("목표 용량을 만족하는 가장 높은 품질을 찾아야 한다", async () => {
    const encode = createFakeEncoder();

    const result = await searchQualityForTargetSize({
      encode,
      targetBytes: 500,
      minQuality: 1,
      maxQuality: 100,
      maxAttempts: 10,
    });

    expect(result.reachedTarget).toBe(true);
    expect(result.blob.size).toBeLessThanOrEqual(500);
    expect(result.quality).toBe(50);
  });

  it("최고 품질이 이미 목표 이하면 추가 탐색 없이 즉시 반환해야 한다", async () => {
    const encode = createFakeEncoder();

    const result = await searchQualityForTargetSize({
      encode,
      targetBytes: 5000,
      minQuality: 1,
      maxQuality: 100,
    });

    expect(result).toMatchObject({ quality: 100, attempts: 1, reachedTarget: true });
    expect(encode).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledWith(100);
  });

  it("하한 품질에서도 목표를 못 맞추면 가장 작은 결과와 함께 reachedTarget false를 반환해야 한다", async () => {
    const encode = createFakeEncoder();

    const result = await searchQualityForTargetSize({
      encode,
      targetBytes: 50,
      minQuality: 40,
      maxQuality: 100,
    });

    expect(result.reachedTarget).toBe(false);
    expect(result.quality).toBe(40);
    expect(result.blob.size).toBe(400);
  });

  it("목표 용량이 0 이하면 탐색 없이 하한 품질 결과를 반환해야 한다", async () => {
    const encode = createFakeEncoder();

    const result = await searchQualityForTargetSize({
      encode,
      targetBytes: 0,
      minQuality: 40,
      maxQuality: 100,
    });

    expect(result).toMatchObject({ quality: 40, attempts: 1, reachedTarget: false });
    expect(encode).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledWith(40);
  });

  it("인코딩 호출 횟수가 maxAttempts를 넘지 않아야 한다", async () => {
    const encode = createFakeEncoder();

    const result = await searchQualityForTargetSize({
      encode,
      targetBytes: 3,
      minQuality: 1,
      maxQuality: 100,
      maxAttempts: 3,
    });

    expect(encode.mock.calls.length).toBeLessThanOrEqual(3);
    expect(result.attempts).toBeLessThanOrEqual(3);
  });

  it("minQuality가 maxQuality보다 크면 RangeError를 던져야 한다", async () => {
    await expect(
      searchQualityForTargetSize({
        encode: createFakeEncoder(),
        targetBytes: 100,
        minQuality: 90,
        maxQuality: 10,
      }),
    ).rejects.toThrow(RangeError);
  });
});
