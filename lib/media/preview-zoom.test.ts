import { describe, expect, it } from "vitest";
import {
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
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
