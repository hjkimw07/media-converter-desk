export const ONBOARDING_COOKIE_NAME = "media-convert-board:guide-dismissed";
/** "보지 않기"를 선택했을 때 안내를 숨기는 기간. */
export const ONBOARDING_HIDE_DAYS = 7;

const SECONDS_PER_DAY = 60 * 60 * 24;

/**
 * 안내를 이미 닫았는지 판별합니다.
 *
 * @param cookie `document.cookie` 원본 문자열
 * @returns 숨김 쿠키가 살아 있으면 true. 만료된 쿠키는 브라우저가 지우므로 존재 여부만 봅니다.
 */
export function hasDismissedOnboarding(cookie: string | null | undefined): boolean {
  if (!cookie) {
    return false;
  }

  return cookie.split(";").some((entry) => entry.trim().startsWith(`${ONBOARDING_COOKIE_NAME}=`));
}

/**
 * `document.cookie`에 대입할 문자열을 만듭니다.
 *
 * 만료를 `expires` 대신 `max-age`로 두는 이유는 사용자의 시스템 시각·시간대에 흔들리지 않기
 * 때문입니다. 로컬 변환 전용 앱이라 전송할 필요가 없어 `SameSite=Lax`로 좁힙니다.
 *
 * @param days 숨길 일수. 0 이하이면 즉시 만료(= 삭제)합니다.
 */
export function buildOnboardingCookie(days: number = ONBOARDING_HIDE_DAYS): string {
  const maxAge = Math.max(0, Math.round(days * SECONDS_PER_DAY));

  return `${ONBOARDING_COOKIE_NAME}=1; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * 브라우저에서 안내를 이미 닫았는지 확인합니다.
 * 쿠키 접근이 막힌 환경(샌드박스 iframe 등)에서는 안내를 보여주는 쪽으로 기웁니다.
 */
export function isOnboardingDismissed(): boolean {
  try {
    return hasDismissedOnboarding(document.cookie);
  } catch {
    // ignore: 쿠키를 못 읽어도 안내는 떠야 합니다.
    return false;
  }
}

/** 안내를 지정 기간 동안 숨깁니다. */
export function dismissOnboarding(days?: number): void {
  try {
    document.cookie = buildOnboardingCookie(days);
  } catch {
    // ignore: 쿠키 차단 환경에서는 다음 방문에 다시 보여줘도 무방합니다.
  }
}
