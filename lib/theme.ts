export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "media-convert-board:theme";

/** 다크가 기본값입니다. 저장된 값이 없거나 알 수 없으면 다크로 둡니다. */
export function normalizeTheme(value: string | null | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

export function readStoredTheme(storage: Pick<Storage, "getItem">): Theme {
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    // ignore: 프라이빗 모드 등에서 storage 접근이 막혀도 기본 테마로 동작해야 합니다.
    return "dark";
  }
}

export function writeStoredTheme(storage: Pick<Storage, "setItem">, theme: Theme): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore: 저장 실패는 테마 적용 자체를 막지 않습니다.
  }
}

/**
 * 라이트일 때만 클래스를 붙입니다. 다크 토큰이 :root에 있으므로
 * 클래스가 없는 상태가 곧 다크입니다.
 */
export function applyTheme(root: { classList: Pick<DOMTokenList, "toggle"> }, theme: Theme): void {
  root.classList.toggle("light", theme === "light");
}
