import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light");
  });

  it("저장값이 없으면 다크 상태로 그려야 한다", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "라이트 모드로 전환" })).toHaveAttribute("aria-pressed", "true");
  });

  it("저장된 라이트 테마를 복원해야 한다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toHaveAttribute("aria-pressed", "false");
  });

  it("클릭하면 라이트로 전환하고 클래스와 저장값을 갱신해야 한다", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
  });

  it("다시 클릭하면 다크로 되돌아가야 한다", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));
    fireEvent.click(screen.getByRole("button", { name: "다크 모드로 전환" }));

    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
