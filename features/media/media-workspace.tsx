"use client";

import {
  CheckCircle2,
  CheckSquare,
  Download,
  FileStack,
  HardDrive,
  ImageIcon,
  ListChecks,
  Settings,
  VideoIcon,
  X,
} from "lucide-react";
import { saveAs } from "file-saver";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DownloadPanel } from "@/features/download/download-panel";
import { ImageSettingsPanel } from "@/features/image/image-settings-panel";
import { ArchiveNamingPanel } from "@/features/media/archive-naming-panel";
import { BatchFileList } from "@/features/media/batch-file-list";
import { OutputNamingPanel } from "@/features/media/output-naming-panel";
import { PreviewPanel } from "@/features/media/preview-panel";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { FileUploader } from "@/features/upload/file-uploader";
import { VideoSettingsPanel } from "@/features/video/video-settings-panel";
import { processVideoInBrowser } from "@/lib/ffmpeg/client";
import { processImageInBrowser } from "@/lib/image/process-image";
import { createUniqueArchivePath, getArchiveFilename, getZipOutputPath } from "@/lib/media/archive";
import { getDownloadDeliveryMode } from "@/lib/media/download-selection";
import { createOutputFilename } from "@/lib/media/filenames";
import { getMediaFolderKey } from "@/lib/media/folders";
import { formatBytes } from "@/lib/media/format";
import { extractImageMetadata, extractVideoMetadata } from "@/lib/media/metadata";
import {
  DEFAULT_LEFT_PANEL_WIDTH,
  clampLeftPanelWidth,
  readStoredInspectorOpen,
  readStoredLeftPanelWidth,
  writeStoredInspectorOpen,
  writeStoredLeftPanelWidth,
} from "@/lib/media/panel-layout";
import { getBrowserVideoDecision } from "@/lib/video/capability";
import { validateMediaFile } from "@/lib/validation/media-validation";
import { useMediaStore } from "@/stores/media-store";
import { cn } from "@/lib/utils";
import type {
  ApiError,
  ImageMetadata,
  ImageProcessOptions,
  MediaType,
  ProcessResult,
  UploadedMedia,
  VideoMetadata,
  VideoProcessOptions,
} from "@/types/media";

/**
 * 지표 아이콘 색. 넓은 면이 아니라 아이콘에만 쓰는 작은 accent라
 * "accent를 chrome으로 쓰지 않는다"는 규칙을 지키면서 구분을 살립니다.
 */
const METRIC_TONE_CLASS: Record<string, string> = {
  neutral: "text-ink",
  image: "text-link",
  video: "text-accent-violet",
  selected: "text-warning",
  converted: "text-accent-cyan",
  inputSize: "text-faint",
  outputSize: "text-accent-pink",
};

type UploadErrorItem = {
  id: string;
  fileName: string;
  error: ApiError;
};

export function MediaWorkspace() {
  const [uploadErrors, setUploadErrors] = useState<UploadErrorItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_LEFT_PANEL_WIDTH);
  const [isInspectorOpen, setInspectorOpen] = useState(false);
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const items = useMediaStore((state) => state.items);
  const selectedId = useMediaStore((state) => state.selectedId);
  const imageOptions = useMediaStore((state) => state.imageOptions);
  const videoOptions = useMediaStore((state) => state.videoOptions);
  const filenameTemplate = useMediaStore((state) => state.filenameTemplate);
  const archiveName = useMediaStore((state) => state.archiveName);
  const addItem = useMediaStore((state) => state.addItem);
  const clearItems = useMediaStore((state) => state.clearItems);
  const removeItem = useMediaStore((state) => state.removeItem);
  const updateItemName = useMediaStore((state) => state.updateItemName);
  const renameFolderGroup = useMediaStore((state) => state.renameFolderGroup);
  const reorderGroups = useMediaStore((state) => state.reorderGroups);
  const reorderItems = useMediaStore((state) => state.reorderItems);
  const selectItem = useMediaStore((state) => state.selectItem);
  const updateStatus = useMediaStore((state) => state.updateStatus);
  const updateProgress = useMediaStore((state) => state.updateProgress);
  const setResult = useMediaStore((state) => state.setResult);
  const setError = useMediaStore((state) => state.setError);
  const updateImageOptions = useMediaStore((state) => state.updateImageOptions);
  const updateVideoOptions = useMediaStore((state) => state.updateVideoOptions);
  const updateFilenameTemplate = useMediaStore((state) => state.updateFilenameTemplate);
  const updateArchiveName = useMediaStore((state) => state.updateArchiveName);
  const renameResults = useMediaStore((state) => state.renameResults);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId),
    [items, selectedId],
  );
  const checkedItems = useMemo(() => items.filter((item) => checkedIds.has(item.id)), [checkedIds, items]);
  const isProcessing = items.some((item) => item.status === "processing" || item.status === "pending");
  // 미지원 파일은 확장자를 못 읽어 image로 분류되므로(getFallbackMediaType) 집계에서 제외합니다.
  const convertibleItems = items.filter((item) => !isUnsupportedMediaItem(item));
  const imageCount = convertibleItems.filter((item) => item.type === "image").length;
  const videoCount = convertibleItems.filter((item) => item.type === "video").length;
  const convertedCount = items.filter((item) => item.result).length;
  const totalInputSize = items.reduce((total, item) => total + item.size, 0);
  const totalOutputSize = items.reduce((total, item) => total + (item.result?.size ?? 0), 0);
  const selectedSize = checkedItems.reduce((total, item) => total + item.size, 0);
  const checkedConvertedCount = checkedItems.filter((item) => item.result).length;
  const checkedFailedCount = checkedItems.filter((item) => item.status === "failed" && !item.result).length;
  const checkedPendingCount = checkedItems.filter((item) => !item.result && item.status !== "failed").length;
  const conversionCount = checkedItems.filter(
    (item) => !item.result && item.status !== "pending" && item.status !== "processing" && !isUnsupportedMediaItem(item),
  ).length;
  const downloadableItems = checkedItems.filter((item): item is UploadedMedia & { result: ProcessResult } => Boolean(item.result));
  const downloadableCount = downloadableItems.length;
  const selectedOutputFormat =
    selectedItem?.type === "image" ? imageOptions.outputFormat : selectedItem?.type === "video" ? videoOptions.outputFormat : undefined;
  const workspaceStyle = { "--source-panel-width": `${leftPanelWidth}px` } as CSSProperties;

  useEffect(() => () => clearItems(), [clearItems]);

  useEffect(() => {
    try {
      setLeftPanelWidth(readStoredLeftPanelWidth(window.localStorage));
      setInspectorOpen(readStoredInspectorOpen(window.localStorage));
    } catch {
      setLeftPanelWidth(DEFAULT_LEFT_PANEL_WIDTH);
      setInspectorOpen(false);
    }
  }, []);

  useEffect(() => {
    setCheckedIds((current) => {
      const itemIds = new Set(items.map((item) => item.id));
      const next = new Set<string>();

      current.forEach((id) => {
        if (itemIds.has(id)) {
          next.add(id);
        }
      });

      return next.size === current.size ? current : next;
    });
  }, [items]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const errors: UploadErrorItem[] = [];

      for (const file of files) {
        const id = createMediaId();
        const validation = validateMediaFile(file);

        if (!validation.ok) {
          errors.push({ id, fileName: file.name, error: validation.error });
          addItem({
            id,
            file,
            type: getFallbackMediaType(file),
            name: file.name,
            size: file.size,
            mimeType: file.type || "unknown",
            objectUrl: "",
            status: "failed",
            progress: 0,
            warnings: [],
            error: validation.error,
          });
          continue;
        }

        const objectUrl = URL.createObjectURL(file);

        try {
          const metadata =
            validation.mediaType === "image"
              ? await extractImageMetadata(file, objectUrl)
              : await extractVideoMetadata(file, objectUrl);

          addItem({
            id,
            file,
            type: validation.mediaType,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            objectUrl,
            metadata,
            status: "idle",
            progress: 0,
            warnings: validation.warnings,
          });
        } catch (error) {
          addItem({
            id,
            file,
            type: validation.mediaType,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            objectUrl,
            status: "failed",
            progress: 0,
            warnings: validation.warnings,
            error: {
              code: "metadata_failed",
              message: "파일 메타데이터를 읽지 못했습니다.",
              detail: error instanceof Error ? error.message : undefined,
            },
          });
        }
      }

      setUploadErrors(errors);
    },
    [addItem],
  );

  const scrollToSourceItem = useCallback(
    (id: string) => {
      selectItem(id);
      document.getElementById(`media-row-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [selectItem],
  );

  const processMediaItem = useCallback(
    async (item: UploadedMedia, outputIndex?: number): Promise<ProcessResult | undefined> => {
      updateStatus(item.id, "pending", 2);
      try {
        if (item.type === "image") {
          const metadata = item.metadata as ImageMetadata | undefined;

          if (!metadata) {
            throw new Error("Image metadata is missing.");
          }

          updateStatus(item.id, "processing", 8);
          const result = await processImageInBrowser(item.file, imageOptions, metadata, (progress) =>
            updateProgress(item.id, progress),
          );
          const namedResult = applyOutputFilename(result, item, outputIndex, filenameTemplate);
          setResult(item.id, namedResult);
          return namedResult;
        }

        const metadata = item.metadata as VideoMetadata | undefined;

        if (!metadata) {
          throw new Error("Video metadata is missing.");
        }

        const decision = getBrowserVideoDecision({
          fileSize: item.size,
          duration: metadata.duration,
          isMobile: isLikelyMobile(),
        });

        if (decision.mode === "server_recommended") {
          setError(item.id, {
            code: "server_recommended",
            message: decision.reason,
            detail: "MVP에서는 서버 FFmpeg와 대용량 큐가 스텁으로만 준비되어 있습니다.",
          });
          return undefined;
        }

        updateStatus(item.id, "processing", 6);
        const result = await processVideoInBrowser(item.file, videoOptions, metadata, (progress) =>
          updateProgress(item.id, progress),
        );
        const namedResult = applyOutputFilename(result, item, outputIndex, filenameTemplate);
        setResult(item.id, namedResult);
        return namedResult;
      } catch (error) {
        setError(item.id, {
          code: "processing_failed",
          message: item.type === "image" ? "이미지 변환에 실패했습니다." : "영상 변환에 실패했습니다.",
          detail: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    },
    [filenameTemplate, imageOptions, setError, setResult, updateProgress, updateStatus, videoOptions],
  );

  const downloadSingleItem = useCallback(
    async (id: string) => {
      const item = items.find((candidate) => candidate.id === id);

      if (!item || item.status === "pending" || item.status === "processing") {
        return;
      }

      const existingResult = item.result;
      if (existingResult) {
        saveAs(existingResult.blob, existingResult.outputName);
      }
    },
    [items],
  );

  const convertCheckedItems = useCallback(async () => {
    if (checkedItems.length === 0) {
      return;
    }

    for (const item of checkedItems) {
      if (item.result || item.status === "pending" || item.status === "processing" || isUnsupportedMediaItem(item)) {
        continue;
      }

      await processMediaItem(item, items.findIndex((candidate) => candidate.id === item.id) + 1);
    }
  }, [checkedItems, items, processMediaItem]);

  const downloadCheckedItems = useCallback(async () => {
    if (downloadableItems.length === 0) {
      return;
    }

    const deliveryMode = getDownloadDeliveryMode(downloadableItems.length);

    if (deliveryMode === "none") {
      return;
    }

    if (deliveryMode === "single") {
      const [{ result }] = downloadableItems;
      saveAs(result.blob, result.outputName);
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const usedPaths = new Set<string>();

    downloadableItems.forEach((item) => {
      zip.file(createUniqueArchivePath(getZipOutputPath(item), usedPaths), item.result.blob);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, getArchiveFilename(archiveName));
  }, [archiveName, downloadableItems]);

  const toggleCheckedItem = useCallback((id: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const toggleAllChecked = useCallback(
    (checked: boolean) => {
      setCheckedIds(checked ? new Set(items.map((item) => item.id)) : new Set());
    },
    [items],
  );

  const removeFolderItems = useCallback(
    (folderKey: string) => {
      const idsToRemove = items
        .filter((item) => getMediaFolderKey(item.file) === folderKey)
        .map((item) => item.id);

      idsToRemove.forEach(removeItem);
      setCheckedIds((current) => {
        const next = new Set(current);
        idsToRemove.forEach((id) => next.delete(id));
        return next;
      });
    },
    [items, removeItem],
  );

  const clearSourceMedia = useCallback(() => {
    clearItems();
    setCheckedIds(new Set());
    setUploadErrors([]);
    setClearConfirmOpen(false);
  }, [clearItems]);

  const applyTemplateToCheckedResults = useCallback(() => {
    renameResults([...checkedIds]);
  }, [checkedIds, renameResults]);

  const openInspector = useCallback(() => {
    setInspectorOpen(true);
    try {
      writeStoredInspectorOpen(window.localStorage, true);
    } catch {
      // Settings still opens when browser storage is unavailable.
    }
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    try {
      writeStoredInspectorOpen(window.localStorage, false);
    } catch {
      // Settings still closes when browser storage is unavailable.
    }
  }, []);

  const startLeftPanelResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      let nextWidth = leftPanelWidth;
      const startX = event.clientX;
      const startWidth = leftPanelWidth;

      const handleMove = (moveEvent: PointerEvent) => {
        nextWidth = clampLeftPanelWidth(startWidth + moveEvent.clientX - startX);
        setLeftPanelWidth(nextWidth);
      };

      const handleUp = () => {
        try {
          writeStoredLeftPanelWidth(window.localStorage, nextWidth);
        } catch {
          // Width remains in memory when browser storage is unavailable.
        }
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [leftPanelWidth],
  );

  return (
    <main className="min-h-[100svh] bg-background text-foreground xl:h-[100svh] xl:overflow-hidden">
      <div className="flex min-h-[100svh] flex-col xl:h-full xl:min-h-0">
        <header className="mesh-gradient shrink-0 border-b border-border bg-card">
          <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-3 px-3 py-3 lg:px-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                <FileStack aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold leading-7 tracking-[-0.4px] text-ink">Media Convert Desk</h1>
                <p className="hidden truncate text-sm leading-5 text-body md:block">
                  이미지와 짧은 영상을 로컬에서 변환하고, 서버/AI 처리는 후속 확장 지점으로 분리합니다.
                </p>
              </div>
              <ThemeToggle className="ml-auto xl:hidden" />
            </div>

            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[900px] xl:grid-cols-7 2xl:min-w-[980px]">
                <Metric icon={FileStack} value={items.length} label="Total" tone="neutral" />
                <Metric icon={ImageIcon} value={imageCount} label="Images" tone="image" />
                <Metric icon={VideoIcon} value={videoCount} label="Videos" tone="video" />
                <Metric icon={CheckSquare} value={checkedItems.length} label="Selected" tone="selected" />
                <Metric icon={CheckCircle2} value={convertedCount} label="Converted" tone="converted" />
                <Metric icon={HardDrive} value={formatBytes(totalInputSize)} label="Input Total Size" tone="inputSize" />
                <Metric icon={Download} value={formatBytes(totalOutputSize)} label="Output Total Size" tone="outputSize" />
              </div>
              <ThemeToggle className="hidden xl:inline-flex" />
            </div>
          </div>
        </header>

        <div
          className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col gap-3 p-3 lg:p-4 xl:min-h-0 xl:flex-row xl:overflow-hidden"
          style={workspaceStyle}
        >
          <aside
            data-testid="source-panel"
            className="flex min-h-0 flex-col gap-3 overflow-hidden xl:h-full xl:min-h-0 xl:shrink-0 xl:basis-[var(--source-panel-width)]"
          >
            <FileUploader onFilesSelected={handleFilesSelected} />
            {uploadErrors.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-secondary p-4">
                {uploadErrors.map((error) => (
                  <div key={error.id} className="flex flex-wrap items-center gap-1 text-sm text-destructive">
                    <Button
                      aria-label={`Scroll to unsupported file ${error.fileName}`}
                      className="h-auto min-w-0 px-0 py-0 text-sm font-semibold text-destructive underline-offset-4 hover:underline"
                      variant="ghost"
                      onClick={() => scrollToSourceItem(error.id)}
                    >
                      {error.fileName}
                    </Button>
                    <span className="min-w-0">{error.error.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <section
              data-testid="source-queue-card"
              className="flex h-[min(42svh,360px)] shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card xl:h-auto xl:min-h-0 xl:flex-1"
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-semibold leading-6 text-ink">
                    <ListChecks aria-hidden="true" className="size-4 shrink-0 text-link" />
                    Source queue
                  </h2>
                  <p className="font-brand-mono text-xs text-muted-foreground">
                    {formatBytes(totalInputSize)} input · {formatBytes(totalOutputSize)} output
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <Badge variant="secondary">{items.length} files</Badge>
                </div>
              </div>
              <BatchFileList
                checkedIds={checkedIds}
                items={items}
                selectedId={selectedId}
                onDownload={(id) => {
                  void downloadSingleItem(id);
                }}
                onRemove={removeItem}
                onRemoveFolder={removeFolderItems}
                onRename={updateItemName}
                onRenameFolder={renameFolderGroup}
                onReorderGroup={reorderGroups}
                onReorder={reorderItems}
                onSelect={selectItem}
                onToggleAll={toggleAllChecked}
                onClearAll={() => setClearConfirmOpen(true)}
                onToggleChecked={toggleCheckedItem}
              />
            </section>
          </aside>

          <button
            aria-label="Resize source queue"
            className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center rounded-sm border border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary xl:flex"
            type="button"
            onPointerDown={startLeftPanelResize}
          >
            <span className="h-12 w-px rounded-full bg-current" />
          </button>

          <section
            data-testid="media-main-panel"
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible pb-[164px] xl:overflow-hidden xl:pb-0"
          >
            <PreviewPanel
              action={
                <Button
                  aria-label="Open settings"
                  aria-pressed={isInspectorOpen}
                  className={cn(
                    "size-9 shrink-0 border-primary bg-primary p-0 text-primary-foreground transition-all duration-200 hover:bg-primary/85 [&_svg]:transition-transform [&_svg]:duration-300",
                    isInspectorOpen && "[&_svg]:rotate-90",
                  )}
                  size="icon"
                  title="Settings"
                  variant="secondary"
                  onClick={openInspector}
                >
                  <Settings aria-hidden="true" />
                </Button>
              }
              item={selectedItem}
            />
            <DownloadPanel
              className="fixed inset-x-3 bottom-3 z-40 shadow-2xl xl:static xl:inset-auto xl:z-auto xl:shadow-none"
              conversionCount={conversionCount}
              convertedCount={checkedConvertedCount}
              downloadableCount={downloadableCount}
              failedCount={checkedFailedCount}
              isProcessing={Boolean(isProcessing)}
              pendingCount={checkedPendingCount}
              selectedCount={checkedItems.length}
              selectedSize={selectedSize}
              onConvertSelected={() => {
                void convertCheckedItems();
              }}
              onDownloadSelected={() => {
                void downloadCheckedItems();
              }}
            />
          </section>
          <InspectorDrawer
            checkedCount={checkedItems.length}
            isOpen={isInspectorOpen}
            outputFormat={selectedOutputFormat}
            selectedItem={selectedItem}
            archiveName={archiveName}
            filenameTemplate={filenameTemplate}
            imageOptions={imageOptions}
            videoOptions={videoOptions}
            onApplyTemplate={applyTemplateToCheckedResults}
            onClose={closeInspector}
            onFilenameTemplateChange={updateFilenameTemplate}
            onArchiveNameChange={updateArchiveName}
            onImageOptionsChange={updateImageOptions}
            onVideoOptionsChange={updateVideoOptions}
          />
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="전체 삭제"
        description={`큐에 있는 ${items.length}개 항목과 변환 결과가 모두 사라집니다. 이 동작은 되돌릴 수 없습니다.`}
        destructive
        open={isClearConfirmOpen}
        title="소스 큐를 전체 삭제할까요?"
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={clearSourceMedia}
      />
    </main>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof FileStack;
  value: number | string;
  label: string;
  tone: "neutral" | "image" | "video" | "selected" | "converted" | "inputSize" | "outputSize";
}) {
  const testId = `metric-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-border bg-secondary px-2 py-1.5 transition-colors duration-150 hover:border-foreground/25",
      )}
    >
      <div
        className={cn(
          "hidden size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background transition-colors duration-150 sm:flex",
          METRIC_TONE_CLASS[tone],
        )}
      >
        <Icon aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-brand-mono truncate text-base font-semibold leading-5 text-ink">{value}</p>
        <p className="truncate text-xs text-muted-foreground" title={label}>
          {label}
        </p>
      </div>
    </div>
  );
}

function InspectorDrawer({
  isOpen,
  selectedItem,
  checkedCount,
  outputFormat,
  archiveName,
  filenameTemplate,
  imageOptions,
  videoOptions,
  onClose,
  onApplyTemplate,
  onArchiveNameChange,
  onFilenameTemplateChange,
  onImageOptionsChange,
  onVideoOptionsChange,
}: {
  isOpen: boolean;
  selectedItem?: UploadedMedia;
  checkedCount: number;
  outputFormat?: string;
  archiveName: string;
  filenameTemplate: string;
  imageOptions: ImageProcessOptions;
  videoOptions: VideoProcessOptions;
  onClose: () => void;
  onApplyTemplate: () => void;
  onArchiveNameChange: (name: string) => void;
  onFilenameTemplateChange: (template: string) => void;
  onImageOptionsChange: (options: Partial<ImageProcessOptions>) => void;
  onVideoOptionsChange: (options: Partial<VideoProcessOptions>) => void;
}) {
  return (
    <div
      aria-hidden={!isOpen}
      data-state={isOpen ? "open" : "closed"}
      data-testid="settings-drawer"
      className={cn(
        "fixed inset-0 z-50 transition-opacity duration-200 ease-out",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        aria-label="Close settings overlay"
        className="absolute inset-0 bg-ink/40 transition-opacity duration-200"
        type="button"
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out sm:w-[420px]",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold leading-6 text-ink">
              <Settings aria-hidden="true" className="size-4 shrink-0 text-link" />
              Settings
            </h2>
            <p className="truncate text-sm leading-5 text-muted-foreground">
              {selectedItem ? selectedItem.name : "큐에서 항목을 선택하면 설정이 활성화됩니다."}
            </p>
          </div>
          <Button aria-label="Close settings" size="icon" variant="ghost" onClick={onClose}>
            <X data-icon="inline-start" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {selectedItem?.type === "image" ? <ImageSettingsPanel options={imageOptions} onChange={onImageOptionsChange} /> : null}
          {selectedItem?.type === "video" ? <VideoSettingsPanel options={videoOptions} onChange={onVideoOptionsChange} /> : null}
          <OutputNamingPanel
            checkedCount={checkedCount}
            outputFormat={outputFormat}
            selectedItem={selectedItem}
            template={filenameTemplate}
            onApplyToChecked={onApplyTemplate}
            onTemplateChange={onFilenameTemplateChange}
          />
          <ArchiveNamingPanel archiveName={archiveName} onArchiveNameChange={onArchiveNameChange} />
          {!selectedItem ? (
            <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed hairline-dashed bg-secondary/40 p-4 text-center text-sm leading-6 text-muted-foreground">
              파일을 선택하면 이미지/영상 변환 설정이 여기에 표시됩니다.
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function applyOutputFilename(result: ProcessResult, item: UploadedMedia, index: number | undefined, template: string) {
  return {
    ...result,
    outputName: createOutputFilename({
      originalName: item.name,
      format: getResultFormat(result),
      width: result.width ?? item.metadata?.width,
      height: result.height ?? item.metadata?.height,
      index,
      template,
    }),
  };
}

function getResultFormat(result: ProcessResult) {
  const outputExtension = result.outputName.split(".").pop();

  if (outputExtension) {
    return outputExtension.toLowerCase();
  }

  if (result.mimeType === "image/jpeg") {
    return "jpg";
  }

  return result.mimeType.split("/").pop()?.toLowerCase() || "converted";
}

function createMediaId() {
  return "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isLikelyMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getFallbackMediaType(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

function isUnsupportedMediaItem(item: UploadedMedia) {
  return item.status === "failed" && item.error?.code === "unsupported_file_type";
}
