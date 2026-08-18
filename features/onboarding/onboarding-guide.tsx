"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Layers, ListChecks, Settings, Sparkles, Upload, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROJECT_NAME } from "@/constants/project";
import { ONBOARDING_HIDE_DAYS, dismissOnboarding } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type OnboardingGuideProps = {
  open: boolean;
  /** 안내를 닫을 때 호출됩니다. 숨김 쿠키 기록은 이 컴포넌트가 끝낸 뒤입니다. */
  onClose: () => void;
  className?: string;
};

type GuideStep = {
  icon: LucideIcon;
  /** 아이콘 색. 헤더 mesh와 같은 accent 계열을 순서대로 돌려 단계를 구분합니다. */
  tone: string;
  title: string;
  description: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: Upload,
    tone: "text-link",
    title: "파일 담기",
    description: "왼쪽 영역에 끌어다 놓거나 Files·Folder 버튼으로 고릅니다. 폴더는 그룹으로 묶여 들어옵니다.",
  },
  {
    icon: Settings,
    tone: "text-accent-violet",
    title: "변환 설정",
    description: "Settings 버튼에서 출력 포맷·품질·목표 용량·해상도를 정합니다. 설정은 대기열 전체에 적용됩니다.",
  },
  {
    icon: ListChecks,
    tone: "text-warning",
    title: "대기열 정리",
    description: "체크박스로 다룰 항목을 고르고, 왼쪽 손잡이를 끌어 순서를 바꿉니다. 그룹은 접거나 통째로 지울 수 있습니다.",
  },
  {
    icon: Layers,
    tone: "text-accent-cyan",
    title: "결과 비교",
    description: "항목을 클릭하면 원본과 결과가 같은 캔버스에 놓입니다. 확대한 뒤 끌면 두 화면이 함께 움직입니다.",
  },
  {
    icon: Download,
    tone: "text-accent-pink",
    title: "내려받기",
    description: "한 개는 파일 그대로, 여러 개는 ZIP으로 묶어 내려받습니다. 파일명 규칙도 설정에서 바꿉니다.",
  },
];

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["-", "="], description: "미리보기 10% 축소 / 확대" },
  { keys: ["Shift", "-", "="], description: "미리보기 100% 축소 / 확대" },
  { keys: ["Enter"], description: "배율 입력 확정" },
  { keys: ["Esc"], description: "열려 있는 창 닫기" },
];

/**
 * 최초 접속자에게 조작 방법을 순서대로 보여주는 안내 창.
 *
 * 새 의존성 없이 앱의 ConfirmDialog와 같은 방식으로 만들었습니다.
 * Escape·배경 클릭으로 닫히고, 열릴 때 닫기 버튼에 포커스를 둡니다.
 * 좁은 화면에서는 하단 시트, 넓은 화면에서는 가운데 카드로 붙습니다.
 */
export function OnboardingGuide({ open, onClose, className }: OnboardingGuideProps) {
  const titleId = useId();
  const descriptionId = useId();
  const hideCheckboxId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shouldHideForWeek, setShouldHideForWeek] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const close = () => {
    if (shouldHideForWeek) {
      dismissOnboarding();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" data-testid="onboarding-guide">
      <button aria-label="안내 닫기" className="scrim absolute inset-0" type="button" onClick={close} />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "animate-rise relative flex max-h-[92svh] w-full flex-col rounded-t-md border border-border bg-card shadow-floating",
          "sm:max-h-[88svh] sm:max-w-lg sm:rounded-md lg:max-w-3xl",
          className,
        )}
        role="dialog"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-border p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-6 text-ink" id={titleId}>
              {PROJECT_NAME} 사용법
            </h2>
            <p className="mt-0.5 text-sm leading-5 text-body" id={descriptionId}>
              파일을 담는 것부터 내려받기까지, 순서대로 다섯 단계면 끝납니다.
            </p>
          </div>
          <Button
            aria-label="안내 닫기"
            className="size-8 shrink-0 p-0"
            ref={closeRef}
            size="icon"
            variant="ghost"
            onClick={close}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ol className="grid gap-2 sm:gap-3 lg:grid-cols-2">
            {GUIDE_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-md border border-border bg-background p-3"
                data-testid={`onboarding-step-${index + 1}`}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary">
                  <step.icon aria-hidden="true" className={cn("size-4", step.tone)} />
                </div>
                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-1.5 text-sm font-semibold leading-5 text-ink">
                    {/* 번호는 순서를 나타내는 장식이라 제목 낭독을 방해하지 않게 색만 낮춥니다. */}
                    <span className="font-brand-mono text-xs text-muted-foreground">{index + 1}</span>
                    {step.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-body">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="mt-3 rounded-md border border-border bg-background p-3">
            <h3 className="eyebrow text-muted-foreground">Shortcuts</h3>
            <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center gap-2 rounded-sm bg-secondary px-2 py-1.5">
                  <dt className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="font-brand-mono inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-card px-1 text-[11px] leading-4 text-ink"
                      >
                        {key}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="min-w-0 text-xs leading-4 text-body">{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm leading-5 text-body" htmlFor={hideCheckboxId}>
            <input
              checked={shouldHideForWeek}
              className="size-4 cursor-pointer rounded-sm border border-input accent-primary"
              id={hideCheckboxId}
              type="checkbox"
              onChange={(event) => setShouldHideForWeek(event.currentTarget.checked)}
            />
            {ONBOARDING_HIDE_DAYS}일간 보지 않기
          </label>
          <Button className="w-full sm:w-auto" onClick={close}>
            시작하기
          </Button>
        </footer>
      </div>
    </div>
  );
}
