import { afterEach, describe, expect, it, vi } from "vitest";
import { MIME_BY_IMAGE_FORMAT, encodeImage, isLossyFormat } from "./encoders";
import type { ImageOutputFormat } from "@/types/media";

describe("isLossyFormat", () => {
  it("품질 축을 가진 포맷이면 true를 반환해야 한다", () => {
    expect(isLossyFormat("jpg")).toBe(true);
    expect(isLossyFormat("webp")).toBe(true);
    expect(isLossyFormat("avif")).toBe(true);
  });

  it("무손실 포맷이면 false를 반환해야 한다", () => {
    expect(isLossyFormat("png")).toBe(false);
  });
});

describe("MIME_BY_IMAGE_FORMAT", () => {
  it("모든 출력 포맷에 MIME 타입이 매핑되어 있어야 한다", () => {
    const formats: ImageOutputFormat[] = ["jpg", "png", "webp", "avif"];

    for (const format of formats) {
      expect(MIME_BY_IMAGE_FORMAT[format]).toMatch(/^image\//);
    }
  });
});

describe("encodeImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) } as ImageData;

  /** jsdom에는 OffscreenCanvas가 없으므로 convertToBlob 호출을 관찰할 수 있는 가짜를 심습니다. */
  function stubOffscreenCanvas(options: { blobType?: string; hasContext?: boolean } = {}) {
    const convertToBlob = vi.fn(async ({ type }: { type: string; quality?: number }) => {
      return new Blob(["x"], { type: options.blobType ?? type });
    });

    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        constructor(
          public width: number,
          public height: number,
        ) {}
        getContext() {
          return options.hasContext === false ? null : { putImageData: vi.fn() };
        }
        convertToBlob = convertToBlob;
      },
    );

    return convertToBlob;
  }

  it("jpg는 quality를 0~1 범위로 변환해 인코더에 넘겨야 한다", async () => {
    const convertToBlob = stubOffscreenCanvas();

    const blob = await encodeImage({ imageData, format: "jpg", quality: 80 });

    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/jpeg", quality: 0.8 });
    expect(blob.type).toBe("image/jpeg");
  });

  it("png는 무손실이므로 quality 없이 인코딩해야 한다", async () => {
    const convertToBlob = stubOffscreenCanvas();

    // oxipng wasm 로드가 실패하면 재압축 전 결과로 폴백해야 한다.
    const blob = await encodeImage({ imageData, format: "png", quality: 10 });

    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/png", quality: undefined });
    expect(blob.type).toBe("image/png");
  });

  it("브라우저가 요청한 포맷을 지원하지 않으면 예외를 던져야 한다", async () => {
    // 미지원 포맷일 때 브라우저는 조용히 PNG를 돌려줍니다.
    stubOffscreenCanvas({ blobType: "image/png" });

    await expect(encodeImage({ imageData, format: "webp", quality: 75 })).rejects.toThrow(
      "This browser cannot encode image/webp.",
    );
  });

  it("2D 컨텍스트를 얻을 수 없으면 예외를 던져야 한다", async () => {
    stubOffscreenCanvas({ hasContext: false });

    await expect(encodeImage({ imageData, format: "jpg", quality: 75 })).rejects.toThrow(
      "Canvas rendering is not available in this browser.",
    );
  });
});
