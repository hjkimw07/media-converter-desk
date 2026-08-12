import { describe, expect, it } from "vitest";
import {
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  anchorScrollToCenter,
  clampZoom,
  parseZoomInput,
  largeStepZoom,
  stepZoom,
} from "./preview-zoom";

describe("clampZoom", () => {
  it("허용 범위 안의 값은 그대로 둬야 한다", () => {
    expect(clampZoom(120)).toBe(120);
  });

  it("범위를 벗어나면 잘라내야 한다", () => {
    expect(clampZoom(10)).toBe(MIN_PREVIEW_ZOOM);
    expect(clampZoom(5000)).toBe(MAX_PREVIEW_ZOOM);
  });

  it("소수는 반올림하고 숫자가 아니면 최소값으로 떨어져야 한다", () => {
    expect(clampZoom(120.4)).toBe(120);
    expect(clampZoom(Number.NaN)).toBe(MIN_PREVIEW_ZOOM);
  });
});

describe("stepZoom", () => {
  it("한 단계씩 고정 폭으로 움직여야 한다", () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
  });

  it("경계를 넘지 않아야 한다", () => {
    expect(stepZoom(MIN_PREVIEW_ZOOM, -1)).toBe(MIN_PREVIEW_ZOOM);
    expect(stepZoom(MAX_PREVIEW_ZOOM, 1)).toBe(MAX_PREVIEW_ZOOM);
  });
});

describe("largeStepZoom", () => {
  it("100%p씩 움직여 미세 조정보다 크게 변해야 한다", () => {
    expect(largeStepZoom(100, 1)).toBe(200);
    expect(largeStepZoom(300, -1)).toBe(200);
    expect(largeStepZoom(100, 1)).toBeGreaterThan(stepZoom(100, 1));
    expect(largeStepZoom(300, -1)).toBeLessThan(stepZoom(300, -1));
  });

  it("경계를 넘지 않아야 한다", () => {
    expect(largeStepZoom(950, 1)).toBe(MAX_PREVIEW_ZOOM);
    expect(largeStepZoom(100, -1)).toBe(MIN_PREVIEW_ZOOM);
  });
});

describe("parseZoomInput", () => {
  it("숫자만 남겨 배율로 바꿔야 한다", () => {
    expect(parseZoomInput("250")).toBe(250);
    expect(parseZoomInput("250%")).toBe(250);
    expect(parseZoomInput("1,000")).toBe(1000);
  });

  it("빈 입력이면 undefined를 돌려 입력 중 상태를 유지해야 한다", () => {
    expect(parseZoomInput("")).toBeUndefined();
    expect(parseZoomInput("%")).toBeUndefined();
  });

  it("범위를 벗어난 입력은 잘라내야 한다", () => {
    expect(parseZoomInput("5")).toBe(MIN_PREVIEW_ZOOM);
    expect(parseZoomInput("99999")).toBe(MAX_PREVIEW_ZOOM);
  });
});

describe("anchorScrollToCenter", () => {
  it("확대하면 화면 중앙이 같은 지점을 가리키도록 스크롤을 밀어야 한다", () => {
    // 400px 뷰포트의 중앙은 내용 좌표 200. 2배로 키우면 그 지점은 400이 되므로 중앙에 두려면 200에서 시작한다.
    expect(anchorScrollToCenter(0, 400, 2)).toBe(200);
    expect(anchorScrollToCenter(200, 400, 2)).toBe(600);
  });

  it("축소해서 시작점보다 앞으로 가면 0에서 멈춰야 한다", () => {
    expect(anchorScrollToCenter(100, 400, 0.5)).toBe(0);
  });

  it("배율이 그대로면 스크롤도 그대로여야 한다", () => {
    expect(anchorScrollToCenter(137, 400, 1)).toBe(137);
  });

  it("뷰포트를 아직 못 잰 상태에서도 음수를 내지 않아야 한다", () => {
    expect(anchorScrollToCenter(0, 0, 2)).toBe(0);
  });
});
