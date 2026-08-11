import { encodeImage, isLossyFormat } from "@/lib/image/encoders";
import { searchQualityForTargetSize } from "@/lib/image/target-size";
import type { EncodeRequest, EncodeResponse } from "@/workers/messages";

/**
 * 이미지 인코딩 전용 Worker.
 *
 * 디코딩과 리사이즈는 메인 스레드가 담당하고(브라우저별 디코더 폴백이 필요합니다),
 * 실제로 느린 wasm 인코딩과 목표 용량 탐색만 여기서 처리해 UI 프리징을 없앱니다.
 */
self.addEventListener("message", async (event: MessageEvent<EncodeRequest>) => {
  const { id, imageData, format, quality, target } = event.data;

  try {
    const encode = (value: number) => encodeImage({ imageData, format, quality: value });

    if (!target || !isLossyFormat(format)) {
      const blob = await encode(quality);
      post({ type: "encode:done", id, blob, reachedTarget: true });
      return;
    }

    const search = await searchQualityForTargetSize({
      encode,
      targetBytes: target.targetBytes,
      minQuality: target.minQuality,
      maxQuality: quality,
    });

    post({ type: "encode:done", id, blob: search.blob, reachedTarget: search.reachedTarget });
  } catch (error) {
    post({ type: "encode:error", id, message: error instanceof Error ? error.message : String(error) });
  }
});

function post(message: EncodeResponse) {
  self.postMessage(message);
}
