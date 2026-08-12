export const MIN_PREVIEW_ZOOM = 50;
export const MAX_PREVIEW_ZOOM = 1000;
/** -, + 버튼의 한 걸음. 미세 조정용입니다. */
export const PREVIEW_ZOOM_STEP = 10;
/** 큰 조정 버튼의 한 걸음. 100%p씩 움직입니다. */
export const PREVIEW_ZOOM_LARGE_STEP = 100;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_PREVIEW_ZOOM;
  }

  return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, Math.round(value)));
}

/** -, + 버튼: 고정 폭으로 한 단계씩 움직입니다. */
export function stepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current + direction * PREVIEW_ZOOM_STEP);
}

/**
 * 큰 조정 버튼: 100%p씩 움직입니다.
 * 미세 조정(10%p)보다 열 배 크게 움직여 긴 이동을 빠르게 끝냅니다.
 */
export function largeStepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current + direction * PREVIEW_ZOOM_LARGE_STEP);
}

/**
 * 배율이 바뀔 때 화면 중앙이 계속 같은 지점을 가리키도록 스크롤 위치를 다시 계산합니다.
 * 보정하지 않으면 스크롤이 0에 남아 확대할수록 좌상단 여백만 보이고,
 * 사용자가 매번 드래그해서 이미지를 찾아와야 합니다.
 *
 * @param scroll 현재 스크롤 오프셋(px)
 * @param viewport 보이는 영역의 길이(px)
 * @param scale 새 배율 / 이전 배율
 * @returns 보정된 스크롤 오프셋(px). 브라우저가 상한은 알아서 자르므로 하한만 막습니다.
 */
export function anchorScrollToCenter(scroll: number, viewport: number, scale: number): number {
  return Math.max(0, (scroll + viewport / 2) * scale - viewport / 2);
}

/**
 * 사용자가 직접 입력한 값을 배율로 바꿉니다.
 * 숫자가 아니면 `undefined`를 돌려 호출부가 입력 중 상태를 유지하게 합니다.
 */
export function parseZoomInput(raw: string): number | undefined {
  const digits = raw.replace(/[^\d]/g, "");

  if (digits === "") {
    return undefined;
  }

  return clampZoom(Number(digits));
}
