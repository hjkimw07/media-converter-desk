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
