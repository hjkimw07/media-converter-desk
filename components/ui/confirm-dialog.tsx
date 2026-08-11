"use client";

import { useEffect, useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** 되돌릴 수 없는 동작이면 확인 버튼을 파괴적 색으로 그립니다. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

/**
 * 되돌릴 수 없는 동작 전에 한 번 더 확인받는 경고 다이얼로그.
 *
 * Radix dialog 의존성을 추가하지 않고 앱의 Settings drawer와 같은 방식으로 만들었습니다.
 * Escape·배경 클릭으로 취소되고, 열릴 때 취소 버튼에 포커스를 둬서 실수로 확인이
 * 눌리지 않게 합니다.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  destructive = false,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid="confirm-dialog">
      <button aria-label="다이얼로그 닫기" className="absolute inset-0 bg-ink/50" type="button" onClick={onCancel} />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "animate-rise relative w-full max-w-sm rounded-md border border-border bg-card p-4 shadow-floating",
          className,
        )}
        role="alertdialog"
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-sm border border-border",
              destructive ? "bg-destructive/10 text-destructive" : "bg-secondary text-link",
            )}
          >
            <TriangleAlert aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-6 text-ink" id={titleId}>
              {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-body" id={descriptionId}>
              {description}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button className="h-9 px-3 text-xs" ref={cancelRef} size="sm" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            className="h-9 px-3 text-xs"
            size="sm"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
