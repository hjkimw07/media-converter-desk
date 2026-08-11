import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeOnMainThread } from "./encode-client";

/** OffscreenCanvas가 quality에 비례하는 크기의 blob을 돌려주도록 심습니다. */
function stubOffscreenCanvas() {
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return { putImageData: vi.fn() };
      }
      async convertToBlob({ type, quality }: { type: string; quality?: number }) {
        return new Blob([new Uint8Array(Math.round((quality ?? 1) * 10000))], { type });
      }
    },
  );
}

const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) } as ImageData;

describe("encodeOnMainThread", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목표 용량이 없으면 지정 품질로 한 번만 인코딩해야 한다", async () => {
    stubOffscreenCanvas();

    const outcome = await encodeOnMainThread({ imageData, format: "jpg", quality: 50 });

    expect(outcome.reachedTarget).toBe(true);
    expect(outcome.blob.size).toBe(5000);
  });

  it("목표 용량이 있으면 품질을 낮춰 목표 이하로 맞춰야 한다", async () => {
    stubOffscreenCanvas();

    const outcome = await encodeOnMainThread({
      imageData,
      format: "jpg",
      quality: 100,
      target: { targetBytes: 3000, minQuality: 10 },
    });

    expect(outcome.reachedTarget).toBe(true);
    expect(outcome.blob.size).toBeLessThanOrEqual(3000);
  });

  it("하한 품질로도 목표를 못 맞추면 reachedTarget false를 반환해야 한다", async () => {
    stubOffscreenCanvas();

    const outcome = await encodeOnMainThread({
      imageData,
      format: "jpg",
      quality: 100,
      target: { targetBytes: 100, minQuality: 90 },
    });

    expect(outcome.reachedTarget).toBe(false);
  });

  it("무손실 포맷은 목표 용량이 있어도 탐색 없이 한 번만 인코딩해야 한다", async () => {
    stubOffscreenCanvas();

    const outcome = await encodeOnMainThread({
      imageData,
      format: "png",
      quality: 80,
      target: { targetBytes: 10, minQuality: 40 },
    });

    // png는 quality 인자를 넘기지 않으므로 스텁이 최대 크기를 돌려줍니다.
    expect(outcome.blob.size).toBe(10000);
    expect(outcome.reachedTarget).toBe(true);
  });
});
