"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, readStoredTheme, writeStoredTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/**
 * 다크/라이트 전환 버튼.
 *
 * 앱 크롬이므로 마케팅 pill이 아니라 6px 사각 고스트 버튼을 씁니다(Geist 규칙).
 * 서버 렌더 시점에는 저장값을 알 수 없어 기본값(다크)으로 그리고,
 * 마운트 후 실제 값으로 맞춥니다.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readStoredTheme(window.localStorage));
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    setTheme(next);
    applyTheme(document.documentElement, next);
    writeStoredTheme(window.localStorage, next);
  };

  const isDark = theme === "dark";

  return (
    <Button
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      className={cn("size-9 shrink-0 p-0", className)}
      size="icon"
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      type="button"
      variant="secondary"
      onClick={toggle}
    >
      {isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  );
}
