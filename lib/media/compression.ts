import { getExtension } from "@/lib/validation/media-validation";
import type { MediaWarning, ResizeMode } from "@/types/media";

export const NO_GAIN_WARNING: MediaWarning = {
  code: "compression_no_gain",
  message: "재압축해도 원본보다 작아지지 않아 원본을 그대로 유지했습니다.",
};

type KeepOriginalInput = {
  originalName: string;
  originalSize: number;
  encodedSize: number;
  outputFormat: string;
  resizeMode: ResizeMode;
};

/**
 * 재인코딩 결과 대신 원본을 그대로 내보내야 하는지 판단합니다.
 *
 * 압축 도구에서 결과가 원본보다 커지면 실패입니다. 단 포맷이나 해상도가 바뀌었다면
 * 사용자가 의도한 변환이므로 커져도 그대로 둡니다.
 */
export function shouldKeepOriginal({
  originalName,
  originalSize,
  encodedSize,
  outputFormat,
  resizeMode,
}: KeepOriginalInput): boolean {
  if (resizeMode !== "original") {
    return false;
  }

  const extension = getExtension(originalName);
  const sameFormat = extension === outputFormat || (outputFormat === "jpg" && extension === "jpeg");

  return sameFormat && encodedSize >= originalSize;
}
