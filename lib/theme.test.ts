import { describe, expect, it, vi } from "vitest";
import { applyTheme, normalizeTheme, readStoredTheme, writeStoredTheme } from "./theme";

describe("normalizeTheme", () => {
  it("light 문자열만 라이트로 인정해야 한다", () => {
    expect(normalizeTheme("light")).toBe("light");
  });

  it("저장값이 없거나 알 수 없으면 다크를 기본값으로 써야 한다", () => {
    expect(normalizeTheme(null)).toBe("dark");
    expect(normalizeTheme(undefined)).toBe("dark");
    expect(normalizeTheme("")).toBe("dark");
    expect(normalizeTheme("sepia")).toBe("dark");
  });
});

describe("readStoredTheme", () => {
  it("저장된 테마를 읽어야 한다", () => {
    expect(readStoredTheme({ getItem: () => "light" })).toBe("light");
  });

  it("storage 접근이 막히면 다크로 폴백해야 한다", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readStoredTheme(storage)).toBe("dark");
  });
});

describe("writeStoredTheme", () => {
  it("선택한 테마를 저장해야 한다", () => {
    const setItem = vi.fn();

    writeStoredTheme({ setItem }, "light");

    expect(setItem).toHaveBeenCalledWith("media-convert-desk:theme", "light");
  });

  it("저장이 실패해도 예외를 밖으로 던지지 않아야 한다", () => {
    const setItem = vi.fn(() => {
      throw new Error("quota");
    });

    expect(() => writeStoredTheme({ setItem }, "dark")).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("라이트일 때만 light 클래스를 붙여야 한다", () => {
    const toggle = vi.fn();

    applyTheme({ classList: { toggle } }, "light");
    expect(toggle).toHaveBeenCalledWith("light", true);

    applyTheme({ classList: { toggle } }, "dark");
    expect(toggle).toHaveBeenLastCalledWith("light", false);
  });
});
