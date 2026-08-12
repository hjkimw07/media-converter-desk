"use client";

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowRight, ChevronsLeft, ChevronsRight, ImageIcon, Layers, Maximize2, Minus, Plus, VideoIcon } from "lucide-react";
import type { ApiError, MediaWarning, UploadedMedia } from "@/types/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatPercentChange } from "@/lib/media/format";
import { buildPreviewMetadata, type PreviewMetadataRow } from "@/lib/media/preview-metadata";
import {
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  anchorScrollToCenter,
  parseZoomInput,
  largeStepZoom,
  stepZoom,
} from "@/lib/media/preview-zoom";
import { Input } from "@/components/ui/input";

type PreviewPanelProps = {
  item?: UploadedMedia;
  action?: React.ReactNode;
};

type PreviewPaneKey = "original" | "result";

export function PreviewPanel({ item, action }: PreviewPanelProps) {
  const [zoom, setZoom] = useState(100);
  const appliedZoomRef = useRef(100);
  const previewFramesRef = useRef<Record<PreviewPaneKey, HTMLDivElement | null>>({
    original: null,
    result: null,
  });
  const setPreviewFrame = useCallback((key: PreviewPaneKey, node: HTMLDivElement | null) => {
    previewFramesRef.current[key] = node;
  }, []);
  const setOriginalFrame = useCallback((node: HTMLDivElement | null) => setPreviewFrame("original", node), [setPreviewFrame]);
  const setResultFrame = useCallback((node: HTMLDivElement | null) => setPreviewFrame("result", node), [setPreviewFrame]);
  const syncPreviewPan = useCallback((sourceFrame: HTMLDivElement) => {
    const sourceMaxLeft = getScrollMax(sourceFrame, "x");
    const sourceMaxTop = getScrollMax(sourceFrame, "y");
    const leftRatio = sourceMaxLeft > 0 ? sourceFrame.scrollLeft / sourceMaxLeft : 0;
    const topRatio = sourceMaxTop > 0 ? sourceFrame.scrollTop / sourceMaxTop : 0;

    Object.values(previewFramesRef.current).forEach((frame) => {
      if (!frame || frame === sourceFrame) {
        return;
      }

      const targetMaxLeft = getScrollMax(frame, "x");
      const targetMaxTop = getScrollMax(frame, "y");

      frame.scrollLeft = sourceMaxLeft > 0 && targetMaxLeft > 0 ? leftRatio * targetMaxLeft : sourceFrame.scrollLeft;
      frame.scrollTop = sourceMaxTop > 0 && targetMaxTop > 0 ? topRatio * targetMaxTop : sourceFrame.scrollTop;
    });
  }, []);

  /*
   * 배율이 바뀌면 두 프레임의 스크롤을 화면 중앙 기준으로 다시 잡습니다.
   * 이미지 크기는 프레임 대비 zoom% 라 내용 길이가 배율에 정비례하므로,
   * scrollWidth를 재지 않고 배율 비만으로 정확히 보정됩니다.
   */
  useLayoutEffect(() => {
    const scale = zoom / appliedZoomRef.current;

    appliedZoomRef.current = zoom;

    if (scale === 1) {
      return;
    }

    Object.values(previewFramesRef.current).forEach((frame) => {
      if (!frame) {
        return;
      }

      frame.scrollLeft = anchorScrollToCenter(frame.scrollLeft, frame.clientWidth, scale);
      frame.scrollTop = anchorScrollToCenter(frame.scrollTop, frame.clientHeight, scale);
    });
  }, [zoom]);

  if (!item) {
    return (
      <section
        data-testid="empty-preview-panel"
        className="relative flex h-[min(58svh,520px)] min-h-[360px] flex-none items-center justify-center overflow-y-auto rounded-md border border-border bg-card p-4 xl:h-auto xl:min-h-0 xl:flex-1 xl:overflow-hidden"
      >
        {action ? <div className="absolute right-4 top-4 z-10">{action}</div> : null}
        {/* 데스크탑에서는 폭이 넉넉해 안내 문장을 한 줄로 둡니다. 좁은 화면에서는 max-w-md 안에서 접힙니다. */}
        <div className="m-auto flex max-w-md flex-col items-center gap-5 py-16 text-center xl:max-w-none">
          <div className="flex size-14 items-center justify-center rounded-sm border border-border bg-secondary text-primary">
            <ImageIcon aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold leading-8">Queue media to begin</h2>
            <p className="text-sm leading-6 text-muted-foreground xl:whitespace-nowrap">
              이미지 또는 짧은 영상을 추가하면 원본과 변환 결과를 같은 캔버스에서 비교합니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const metadata = buildPreviewMetadata(item);
  const zoomOut = () => setZoom((current) => stepZoom(current, -1));
  const zoomIn = () => setZoom((current) => stepZoom(current, 1));
  const zoomOutFast = () => setZoom((current) => largeStepZoom(current, -1));
  const zoomInFast = () => setZoom((current) => largeStepZoom(current, 1));
  const fitPreview = () => setZoom(100);

  return (
    <section
      data-testid="preview-panel"
      className="flex h-[min(54svh,520px)] min-h-[320px] flex-none flex-col overflow-hidden rounded-md border border-border bg-card xl:h-auto xl:min-h-0 xl:flex-1"
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold leading-6 text-ink">
            <Layers aria-hidden="true" className="size-4 shrink-0 text-link" />
            Preview canvas
          </h2>
          <p className="truncate text-sm leading-5 text-muted-foreground">{item.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={item.type === "image" ? "success" : "secondary"}>{item.type.toUpperCase()}</Badge>
          <Badge variant="muted">{item.status}</Badge>
          <Badge variant="muted">{formatBytes(item.size)}</Badge>
          {item.result ? <Badge variant="secondary">{formatPercentChange(item.size, item.result.size)}</Badge> : null}
          <PreviewZoomControls
            zoom={zoom}
            onFit={fitPreview}
            onZoomChange={setZoom}
            onZoomIn={zoomIn}
            onZoomInFast={zoomInFast}
            onZoomOut={zoomOut}
            onZoomOutFast={zoomOutFast}
          />
          {action}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] xl:overflow-hidden">
        <PreviewPane title="Original" description={item.mimeType || "Unknown MIME"}>
          <MediaPreview item={item} src={item.objectUrl} zoom={zoom} onFrameRef={setOriginalFrame} onPanChange={syncPreviewPan} />
          <PreviewMetadata title="Before metadata" rows={metadata.before} />
        </PreviewPane>

        <div className="flex items-center justify-center border-y border-border bg-secondary/50 py-1 xl:border-x xl:border-y-0 xl:px-2 xl:py-0">
          <div className="flex size-7 items-center justify-center rounded-sm border border-border bg-background text-primary">
            <ArrowRight aria-hidden="true" />
          </div>
        </div>

        <PreviewPane
          title="Result"
          description={item.result ? "Converted output" : "Run conversion to preview output"}
        >
          {item.result ? (
            <div key={item.result.objectUrl} className="animate-rise flex min-h-0 flex-1 flex-col gap-3">
              <MediaPreview
                item={item}
                src={item.result.objectUrl}
                resultMimeType={item.result.mimeType}
                zoom={zoom}
                onFrameRef={setResultFrame}
                onPanChange={syncPreviewPan}
              />
              <PreviewMetadata title="After metadata" rows={metadata.after} />
              <ConversionWarnings warnings={item.result.warnings} />
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed hairline-dashed bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                변환 결과 대기 중
              </div>
              <ConversionError error={item.error} />
              <PreviewMetadata title="After metadata" rows={metadata.after} />
            </>
          )}
        </PreviewPane>
      </div>
    </section>
  );
}

/** 변환 실패 사유를 보여줍니다. 원인 파악에 필요한 기술 상세는 접어서 함께 제공합니다. */
function ConversionError({ error }: { error?: ApiError }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive-deep">
      <p className="font-medium">{error.message}</p>
      {error.detail ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-muted-foreground">자세히</summary>
          <p className="font-brand-mono mt-1 break-all text-muted-foreground">{error.detail}</p>
        </details>
      ) : null}
    </div>
  );
}

/** 변환은 성공했지만 사용자가 알아야 할 결과(목표 용량 미달, 원본 유지 등)를 보여줍니다. */
function ConversionWarnings({ warnings }: { warnings?: MediaWarning[] }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className="rounded-sm border border-border bg-warning-soft px-3 py-2 text-xs text-warning-deep"
        >
          {warning.message}
        </li>
      ))}
    </ul>
  );
}

function PreviewZoomControls({
  zoom,
  onFit,
  onZoomChange,
  onZoomIn,
  onZoomInFast,
  onZoomOut,
  onZoomOutFast,
}: {
  zoom: number;
  onFit: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomInFast: () => void;
  onZoomOut: () => void;
  onZoomOutFast: () => void;
}) {
  // 입력 중에는 문자열을 그대로 두어 지웠다 다시 치는 흐름을 막지 않습니다.
  const [draft, setDraft] = useState<string | undefined>();

  const commitDraft = () => {
    if (draft !== undefined) {
      const parsed = parseZoomInput(draft);

      if (parsed !== undefined) {
        onZoomChange(parsed);
      }
    }

    setDraft(undefined);
  };

  return (
    <div className="flex h-8 items-center rounded-sm border border-border bg-secondary">
      <Button aria-label="Fit preview" className="h-7 px-2" size="sm" variant="ghost" onClick={onFit}>
        <Maximize2 data-icon="inline-start" />
        Fit
      </Button>
      <div className="h-5 w-px bg-border" />
      <Button
        aria-label="Zoom out by 100 percent"
        className="size-7 px-0"
        disabled={zoom <= MIN_PREVIEW_ZOOM}
        size="icon"
        title="100% 축소"
        variant="ghost"
        onClick={onZoomOutFast}
      >
        <ChevronsLeft data-icon="inline-start" />
      </Button>
      <Button
        aria-label="Zoom out"
        className="size-7 px-0"
        disabled={zoom <= MIN_PREVIEW_ZOOM}
        size="icon"
        title="한 단계 축소"
        variant="ghost"
        onClick={onZoomOut}
      >
        <Minus data-icon="inline-start" />
      </Button>
      <div className="flex items-center">
        <Input
          aria-label="Zoom percent"
          className="font-brand-mono h-7 w-14 rounded-sm border-transparent bg-transparent px-1 text-center text-xs leading-5"
          inputMode="numeric"
          value={draft ?? String(zoom)}
          onBlur={commitDraft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              return;
            }

            if (event.key === "Escape") {
              setDraft(undefined);
              event.currentTarget.blur();
            }
          }}
        />
        <span aria-hidden="true" className="font-brand-mono -ml-1 text-xs leading-5 text-muted-foreground">
          %
        </span>
      </div>
      <Button
        aria-label="Zoom in"
        className="size-7 px-0"
        disabled={zoom >= MAX_PREVIEW_ZOOM}
        size="icon"
        title="한 단계 확대"
        variant="ghost"
        onClick={onZoomIn}
      >
        <Plus data-icon="inline-start" />
      </Button>
      <Button
        aria-label="Zoom in by 100 percent"
        className="size-7 px-0"
        disabled={zoom >= MAX_PREVIEW_ZOOM}
        size="icon"
        title="100% 확대"
        variant="ghost"
        onClick={onZoomInFast}
      >
        <ChevronsRight data-icon="inline-start" />
      </Button>
    </div>
  );
}

function PreviewPane({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={`preview-pane-${title.toLowerCase()}`}
      className="flex h-[360px] shrink-0 flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 xl:h-auto xl:min-h-0 xl:shrink xl:flex-1"
    >
      <div className="min-w-0 shrink-0">
        <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
        <p className="truncate text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div
        data-testid={`preview-pane-body-${title.toLowerCase()}`}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}

function MediaPreview({
  item,
  src,
  resultMimeType,
  zoom,
  onFrameRef,
  onPanChange,
}: {
  item: UploadedMedia;
  src: string;
  resultMimeType?: string;
  zoom: number;
  onFrameRef: (node: HTMLDivElement | null) => void;
  onPanChange: (sourceFrame: HTMLDivElement) => void;
}) {
  const [isPanning, setIsPanning] = useState(false);
  const panState = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const mediaStyle = {
    height: `${zoom}%`,
    width: `${zoom}%`,
  };
  const canPan = zoom > 100;
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPan) {
      return;
    }

    event.preventDefault();
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !canPan) {
      return;
    }

    const frame = event.currentTarget;
    frame.scrollLeft = panState.current.scrollLeft + (panState.current.startX - event.clientX);
    frame.scrollTop = panState.current.scrollTop + (panState.current.startY - event.clientY);
    onPanChange(frame);
  };
  const stopPan = () => setIsPanning(false);
  const frameClassName =
    "flex h-[220px] shrink-0 overflow-auto rounded-md bg-secondary xl:min-h-[160px] xl:flex-1";
  /*
   * 크기 전환을 두지 않습니다. 전환 중에는 내용 길이가 아직 자라지 않아
   * 중앙 기준 스크롤 보정값이 브라우저에 잘려버리고, 확대 직후 위치가 다시 어긋납니다.
   */
  const mediaClassName = "m-auto max-h-none max-w-none shrink-0 rounded-md object-contain";
  const interactiveFrameProps = {
    onPointerCancel: stopPan,
    onPointerDown: startPan,
    onPointerMove: movePan,
    onPointerUp: stopPan,
    onLostPointerCapture: stopPan,
  };

  if (item.type === "image" || resultMimeType?.startsWith("image/")) {
    return (
      <div
        data-testid="media-preview-frame"
        ref={onFrameRef}
        className={`${frameClassName} ${canPan ? "cursor-grab active:cursor-grabbing" : ""}`}
        {...interactiveFrameProps}
      >
        <img
          alt={item.name}
          className={mediaClassName}
          src={src}
          style={mediaStyle}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="media-preview-frame"
      ref={onFrameRef}
      className={`${frameClassName} ${canPan ? "cursor-grab active:cursor-grabbing" : ""}`}
      {...interactiveFrameProps}
    >
      <video
        className={mediaClassName}
        controls
        muted
        playsInline
        src={src}
        style={mediaStyle}
      >
        <VideoIcon aria-hidden="true" />
      </video>
    </div>
  );
}

function getScrollMax(frame: HTMLDivElement, axis: "x" | "y") {
  return axis === "x"
    ? Math.max(0, frame.scrollWidth - frame.clientWidth)
    : Math.max(0, frame.scrollHeight - frame.clientHeight);
}

function PreviewMetadata({ title, rows }: { title: string; rows: PreviewMetadataRow[] }) {
  return (
    <div className="shrink-0 rounded-md border border-border bg-background p-2">
      <h4 className="mb-2 text-xs font-semibold leading-4 text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="min-w-0 rounded-sm bg-secondary px-2 py-1.5">
            <dt className="text-[11px] leading-4 text-muted-foreground">{row.label}</dt>
            {/* 라벨과 값의 위계를 가중치로만 벌립니다. 색을 더 올리면 잉크 계단이 무너집니다. */}
            <dd className="font-brand-mono truncate text-xs font-medium leading-4 text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
