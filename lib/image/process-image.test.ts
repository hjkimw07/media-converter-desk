import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeImageForCanvas, processImageInBrowser } from "./process-image";
import type { ImageMetadata, ImageProcessOptions } from "@/types/media";

describe("decodeImageForCanvas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to an HTML image when createImageBitmap cannot decode the file", async () => {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 2;
      naturalHeight = 2;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    const decoded = await decodeImageForCanvas(new File(["x"], "sample.png", { type: "image/png" }));

    expect(decoded).toBeInstanceOf(FakeImage);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("processImageInBrowser", () => {
  const metadata: ImageMetadata = { width: 4, height: 4, format: "PNG", hasAlpha: true };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /**
   * 디코딩용 document 캔버스와 인코딩용 OffscreenCanvas를 모두 심습니다.
   * OffscreenCanvas가 지정한 바이트 수만큼의 blob을 돌려줍니다.
   */
  function stubCanvas(encodedBytes: number | ((quality?: number) => number)) {
    const imageData = { width: 4, height: 4, data: new Uint8ClampedArray(64) } as ImageData;

    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => imageData),
        fillStyle: "",
      }),
    } as unknown as HTMLElement);

    const convertToBlob = vi.fn(async ({ type, quality }: { type: string; quality?: number }) => {
      const size = typeof encodedBytes === "function" ? encodedBytes(quality) : encodedBytes;
      return new Blob([new Uint8Array(size)], { type });
    });

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
        convertToBlob = convertToBlob;
      },
    );

    // Worker를 만들 수 없는 환경으로 두어 메인 스레드 폴백 경로를 검증합니다.
    vi.stubGlobal("Worker", undefined);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close: vi.fn() })));
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:result"), revokeObjectURL: vi.fn() });

    return convertToBlob;
  }

  function createOptions(overrides: Partial<ImageProcessOptions> = {}): ImageProcessOptions {
    return {
      outputFormat: "png",
      quality: 80,
      compression: { mode: "quality", minQuality: 40 },
      resize: { mode: "original", maintainAspectRatio: true },
      backgroundColor: "#ffffff",
      stripMetadata: true,
      ...overrides,
    };
  }

  it("같은 포맷 재압축 결과가 원본보다 크면 원본을 그대로 유지해야 한다", async () => {
    stubCanvas(400);
    const file = new File([new Uint8Array(100)], "sample.png", { type: "image/png" });

    const result = await processImageInBrowser(file, createOptions(), metadata, vi.fn());

    expect(result.size).toBe(100);
    expect(result.savedBytes).toBe(0);
    expect(result.warnings).toEqual([expect.objectContaining({ code: "compression_no_gain" })]);
  });

  it("재압축으로 작아지면 절감 바이트를 계산해야 한다", async () => {
    stubCanvas(30);
    const file = new File([new Uint8Array(100)], "sample.png", { type: "image/png" });

    const result = await processImageInBrowser(file, createOptions(), metadata, vi.fn());

    expect(result.size).toBe(30);
    expect(result.savedBytes).toBe(70);
    expect(result.warnings).toBeUndefined();
  });

  it("무손실 포맷으로 목표 용량을 지정하면 보장할 수 없다고 경고해야 한다", async () => {
    stubCanvas(9000);
    const file = new File([new Uint8Array(20000)], "sample.png", { type: "image/png" });
    const options = createOptions({ compression: { mode: "targetSize", targetSizeKb: 1, minQuality: 40 } });

    const result = await processImageInBrowser(file, options, metadata, vi.fn());

    expect(result.warnings).toEqual([expect.objectContaining({ code: "target_size_lossless" })]);
  });

  it("손실 포맷 목표 용량 모드에서 하한 품질로도 못 맞추면 경고해야 한다", async () => {
    // 품질과 무관하게 항상 목표(1KB)보다 큰 인코더
    stubCanvas(5000);
    const file = new File([new Uint8Array(20000)], "sample.jpg", { type: "image/jpeg" });
    const options = createOptions({
      outputFormat: "jpg",
      compression: { mode: "targetSize", targetSizeKb: 1, minQuality: 40 },
    });

    const result = await processImageInBrowser(file, options, metadata, vi.fn());

    expect(result.warnings).toEqual([expect.objectContaining({ code: "target_size_unreachable" })]);
  });

  it("손실 포맷 목표 용량 모드에서 품질을 낮춰 목표를 맞춰야 한다", async () => {
    // quality(0~1)에 비례해 커지는 인코더. 목표 2KB.
    stubCanvas((quality) => Math.round((quality ?? 1) * 10000));
    const file = new File([new Uint8Array(20000)], "sample.jpg", { type: "image/jpeg" });
    const options = createOptions({
      outputFormat: "jpg",
      compression: { mode: "targetSize", targetSizeKb: 2, minQuality: 10 },
    });

    const result = await processImageInBrowser(file, options, metadata, vi.fn());

    expect(result.size).toBeLessThanOrEqual(2048);
    expect(result.warnings).toBeUndefined();
  });
});
