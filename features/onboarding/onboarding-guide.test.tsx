import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingGuide } from "./onboarding-guide";
import { ONBOARDING_COOKIE_NAME, buildOnboardingCookie } from "@/lib/onboarding";

describe("OnboardingGuide", () => {
  afterEach(() => {
    document.cookie = buildOnboardingCookie(0);
  });

  it("열리면 조작 방법을 순서대로 보여줘야 한다", () => {
    render(<OnboardingGuide open onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^onboarding-step-/)).toHaveLength(5);
    expect(screen.getByText("파일 담기")).toBeInTheDocument();
    expect(screen.getByText("내려받기")).toBeInTheDocument();
    expect(screen.getByText("미리보기 100% 축소 / 확대")).toBeInTheDocument();
  });

  it("닫혀 있으면 아무것도 그리지 않아야 한다", () => {
    render(<OnboardingGuide open={false} onClose={vi.fn()} />);

    expect(screen.queryByTestId("onboarding-guide")).not.toBeInTheDocument();
  });

  it("보지 않기를 체크하고 닫으면 숨김 쿠키를 남겨야 한다", () => {
    const onClose = vi.fn();

    render(<OnboardingGuide open onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("7일간 보지 않기"));
    fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(document.cookie).toContain(ONBOARDING_COOKIE_NAME);
  });

  it("체크하지 않고 닫으면 쿠키를 남기지 않아야 한다", () => {
    const onClose = vi.fn();

    render(<OnboardingGuide open onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(document.cookie).not.toContain(ONBOARDING_COOKIE_NAME);
  });

  it("Escape 키로도 닫혀야 한다", () => {
    const onClose = vi.fn();

    render(<OnboardingGuide open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
