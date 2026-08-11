import { describe, expect, it } from "vitest";
import { shouldKeepOriginal } from "./compression";

const base = {
  originalName: "photo.png",
  originalSize: 1000,
  encodedSize: 1200,
  outputFormat: "png",
  resizeMode: "original" as const,
};

describe("shouldKeepOriginal", () => {
  it("같은 포맷 · 해상도 유지인데 결과가 더 크면 원본을 유지해야 한다", () => {
    expect(shouldKeepOriginal(base)).toBe(true);
  });

  it("결과가 원본보다 작으면 재인코딩 결과를 써야 한다", () => {
    expect(shouldKeepOriginal({ ...base, encodedSize: 400 })).toBe(false);
  });

  it("결과가 원본과 정확히 같은 크기면 원본을 유지해야 한다", () => {
    expect(shouldKeepOriginal({ ...base, encodedSize: 1000 })).toBe(true);
  });

  it("포맷이 바뀌었으면 커져도 변환 결과를 유지해야 한다", () => {
    expect(shouldKeepOriginal({ ...base, outputFormat: "webp" })).toBe(false);
  });

  it("리사이즈가 걸려 있으면 커져도 변환 결과를 유지해야 한다", () => {
    expect(shouldKeepOriginal({ ...base, resizeMode: "percent" })).toBe(false);
  });

  it("jpeg 확장자와 jpg 출력은 같은 포맷으로 취급해야 한다", () => {
    expect(shouldKeepOriginal({ ...base, originalName: "photo.jpeg", outputFormat: "jpg" })).toBe(true);
  });

  it("확장자가 없는 파일이면 원본을 유지하지 않아야 한다", () => {
    expect(shouldKeepOriginal({ ...base, originalName: "photo" })).toBe(false);
  });
});
