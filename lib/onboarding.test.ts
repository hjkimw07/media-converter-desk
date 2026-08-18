import { describe, expect, it } from "vitest";
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_HIDE_DAYS,
  buildOnboardingCookie,
  hasDismissedOnboarding,
} from "./onboarding";

describe("hasDismissedOnboarding", () => {
  it("숨김 쿠키가 있으면 닫힌 것으로 봐야 한다", () => {
    expect(hasDismissedOnboarding(`${ONBOARDING_COOKIE_NAME}=1`)).toBe(true);
    expect(hasDismissedOnboarding(`theme=dark; ${ONBOARDING_COOKIE_NAME}=1; other=2`)).toBe(true);
  });

  it("쿠키가 비어 있으면 처음 접속으로 봐야 한다", () => {
    expect(hasDismissedOnboarding("")).toBe(false);
    expect(hasDismissedOnboarding(null)).toBe(false);
    expect(hasDismissedOnboarding(undefined)).toBe(false);
  });

  it("이름이 겹치는 다른 쿠키를 숨김으로 오인하지 않아야 한다", () => {
    expect(hasDismissedOnboarding(`${ONBOARDING_COOKIE_NAME}-other=1`)).toBe(false);
    expect(hasDismissedOnboarding(`prefix-${ONBOARDING_COOKIE_NAME}=1`)).toBe(false);
  });
});

describe("buildOnboardingCookie", () => {
  it("기본 7일치 max-age를 붙여야 한다", () => {
    expect(buildOnboardingCookie()).toBe(
      `${ONBOARDING_COOKIE_NAME}=1; max-age=${ONBOARDING_HIDE_DAYS * 86400}; path=/; SameSite=Lax`,
    );
  });

  it("일수가 0 이하이면 즉시 만료시켜야 한다", () => {
    expect(buildOnboardingCookie(0)).toContain("max-age=0");
    expect(buildOnboardingCookie(-3)).toContain("max-age=0");
  });
});
