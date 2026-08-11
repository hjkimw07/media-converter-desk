import type { ImageOutputFormat } from "@/types/media";

export const MIME_BY_IMAGE_FORMAT: Record<ImageOutputFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const LOSSY_FORMATS = new Set<ImageOutputFormat>(["jpg", "webp", "avif"]);

/**
 * 해당 포맷이 품질(quality) 축을 갖는지 여부.
 * png는 무손실이라 품질을 낮춰 목표 용량을 맞추는 탐색이 불가능합니다.
 */
export function isLossyFormat(format: ImageOutputFormat): boolean {
  return LOSSY_FORMATS.has(format);
}

export type EncodeImageInput = {
  imageData: ImageData;
  format: ImageOutputFormat;
  /** 1~100. png에서는 무시됩니다. */
  quality: number;
};

/**
 * 리사이즈까지 끝난 픽셀을 지정 포맷으로 인코딩합니다.
 *
 * - jpg/webp: OffscreenCanvas 인코더 (quality 반영됨)
 * - png: OffscreenCanvas 인코더 + oxipng 무손실 재압축 (브라우저 PNG 인코더는 압축이 약함)
 * - avif: wasm libavif (브라우저 캔버스가 지원하지 않는 포맷)
 *
 * DOM에 의존하지 않아 메인 스레드와 Worker 양쪽에서 동일하게 동작합니다.
 *
 * @throws 인코딩에 실패하면 예외를 던집니다. png 최적화 실패만 재압축 전 결과로 조용히 폴백합니다.
 */
export async function encodeImage({ imageData, format, quality }: EncodeImageInput): Promise<Blob> {
  if (format === "avif") {
    const { encode } = await import("@jsquash/avif");

    return new Blob([await encode(imageData, { quality })], { type: MIME_BY_IMAGE_FORMAT.avif });
  }

  const blob = await imageDataToBlob(imageData, MIME_BY_IMAGE_FORMAT[format], format === "png" ? undefined : quality / 100);

  return format === "png" ? optimisePng(blob) : blob;
}

async function optimisePng(blob: Blob): Promise<Blob> {
  try {
    // oxipng 기본 레벨(2)을 사용합니다. 레벨 3은 측정상 결과 크기가 같으면서 시간만 2배 이상 듭니다.
    const { optimise } = await import("@jsquash/oxipng");
    const optimised = await optimise(await blob.arrayBuffer());
    const optimisedBlob = new Blob([optimised], { type: MIME_BY_IMAGE_FORMAT.png });

    // oxipng는 무손실이지만 아주 작은 이미지에서는 헤더 오버헤드로 커질 수 있습니다.
    return optimisedBlob.size < blob.size ? optimisedBlob : blob;
  } catch {
    // ignore: PNG 최적화는 부가 기능이므로 실패해도 변환 자체는 성공시킵니다.
    return blob;
  }
}

async function imageDataToBlob(imageData: ImageData, type: string, quality?: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  context.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type, quality });

  // 브라우저가 요청한 포맷을 지원하지 않으면 조용히 PNG를 돌려주므로 직접 확인합니다.
  if (blob.type !== type) {
    throw new Error(`This browser cannot encode ${type}.`);
  }

  return blob;
}
