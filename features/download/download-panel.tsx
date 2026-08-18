"use client";

import { CheckCircle2, Clock3, Download, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/media/format";
import { cn } from "@/lib/utils";

/*
 * 데스크탑에서는 xl:min-h-[72px]가 만든 여유 공간 위쪽에 내용이 붙어 있었습니다.
 * 세로 방향 flex로 감싸 남는 높이를 위아래로 나눠 갖게 합니다.
 */
const PANEL_CLASS =
  "shrink-0 rounded-md border border-border bg-card px-3 py-2 xl:flex xl:min-h-[72px] xl:flex-col xl:justify-center";

/*
 * 데스크탑에서 고정 폭 트랙을 쓰면 상태 카운트 칸(최대 280px)이 글자보다 좁아
 * 여백이 남는데도 "1 con…"으로 잘렸습니다. 폭을 정하지 않고 각 묶음이 제 너비를 갖게 두고,
 * 한 줄에 안 들어가면 줄을 넘겨 잘림을 없앱니다.
 */
const LAYOUT_CLASS = "grid gap-3 xl:flex xl:flex-wrap xl:items-center xl:justify-between xl:gap-x-4 xl:gap-y-2";

type DownloadPanelProps = {
  className?: string;
  selectedCount: number;
  selectedSize: number;
  convertedCount: number;
  pendingCount: number;
  failedCount: number;
  conversionCount: number;
  downloadableCount: number;
  isProcessing: boolean;
  onConvertSelected: () => void;
  onDownloadSelected: () => void;
};

export function DownloadPanel({
  className,
  selectedCount,
  selectedSize,
  convertedCount,
  pendingCount,
  failedCount,
  conversionCount,
  downloadableCount,
  isProcessing,
  onConvertSelected,
  onDownloadSelected,
}: DownloadPanelProps) {
  const isConvertDisabled = conversionCount === 0 || isProcessing;
  const isDownloadDisabled = downloadableCount === 0 || isProcessing;
  const helperText = getHelperText(selectedCount, downloadableCount, isProcessing);
  const hasSelection = selectedCount > 0;

  return (
    <section
      data-testid="download-panel"
      className={cn(PANEL_CLASS, className)}
    >
      <div
        data-testid="download-panel-layout"
        className={LAYOUT_CLASS}
      >
        <div
          className="grid min-w-0 gap-2 xl:contents"
          data-testid="download-summary-status"
        >
          <div className="min-w-0 text-center lg:min-w-[190px] lg:text-left xl:min-h-10 xl:flex-1 xl:basis-[220px]" aria-live="polite" data-testid="download-selection-summary">
            {hasSelection ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:flex-nowrap lg:justify-start">
                  <h3 data-testid="download-selection-title" className="whitespace-nowrap text-sm font-semibold leading-5">
                    {selectedCount}개 선택됨
                  </h3>
                  <span className="sr-only">{selectedCount}개 항목 선택됨</span>
                  <p data-testid="download-selection-size" className="font-brand-mono whitespace-nowrap text-xs leading-5 text-muted-foreground">
                    {formatBytes(selectedSize)}
                  </p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{helperText}</p>
              </>
            ) : (
              <span className="sr-only">선택된 항목 없음</span>
            )}
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2 xl:flex xl:shrink-0 xl:gap-0" data-testid="download-status-row">
            <StatusPill icon={CheckCircle2} isFirst tone="converted" value={convertedCount} label="converted" />
            <StatusPill icon={Clock3} tone="pending" value={pendingCount} label="pending" />
            <StatusPill icon={XCircle} tone="failed" value={failedCount} label="failed" />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 xl:w-[420px] xl:shrink-0" data-testid="download-action-row">
          <Button className="w-full" disabled={isConvertDisabled} size="sm" variant="secondary" onClick={onConvertSelected}>
            <Play data-icon="inline-start" />
            변환 ({conversionCount})
          </Button>
          <Button className="w-full" disabled={isDownloadDisabled} size="sm" onClick={onDownloadSelected}>
            <Download data-icon="inline-start" />
            다운로드 ({downloadableCount})
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  icon: Icon,
  isFirst = false,
  tone,
  value,
  label,
}: {
  icon: typeof CheckCircle2;
  isFirst?: boolean;
  tone: "converted" | "pending" | "failed";
  value: number;
  label: string;
}) {
  return (
    <div
      data-testid={`status-pill-${tone}`}
      className={cn(
        "flex min-w-0 items-center justify-center gap-2 px-2 text-xs leading-5",
        isFirst ? "border-l-0 xl:border-l xl:border-border" : "border-l border-border",
        tone === "converted" && "text-link",
        tone === "pending" && "text-warning-deep",
        tone === "failed" && "text-destructive",
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {/* 좁은 화면에서는 3칸 그리드라 말줄임이 필요하지만, 데스크탑에서는 칸이 내용만큼 늘어나 필요 없습니다. */}
      <span className="font-brand-mono truncate font-semibold text-foreground xl:overflow-visible">
        {value} {label}
      </span>
    </div>
  );
}

function getHelperText(selectedCount: number, downloadableCount: number, isProcessing: boolean) {
  if (isProcessing) {
    return "변환 중...";
  }

  if (selectedCount === 0) {
    return "";
  }

  if (downloadableCount === 0) {
    return "먼저 선택 항목을 변환하세요.";
  }

  return "변환 완료 항목만 다운로드합니다.";
}
