import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaWorkspace } from "./media-workspace";
import { useMediaStore } from "@/stores/media-store";
import type { UploadedMedia } from "@/types/media";
import { processImageInBrowser } from "@/lib/image/process-image";
import { getFileRelativePath } from "@/lib/media/archive";
import { saveAs } from "file-saver";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("@/lib/image/process-image", () => ({
  processImageInBrowser: vi.fn(async (_file, _options, _metadata, onProgress?: (progress: number) => void) => {
    onProgress?.(100);

    return {
      blob: new Blob(["converted"], { type: "image/webp" }),
      objectUrl: "blob:converted",
      outputName: "sample.webp",
      size: 1,
      mimeType: "image/webp",
      width: 100,
      height: 80,
    };
  }),
}));

describe("MediaWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    useMediaStore.setState({
      items: [],
      selectedId: undefined,
      archiveName: "converted-media-results",
    });
    vi.mocked(processImageInBrowser).mockClear();
    vi.mocked(saveAs).mockClear();
  });

  it("removes the current-job card and legacy metadata/sidebar cards", () => {
    render(<MediaWorkspace />);

    expect(screen.queryByText("Current job")).not.toBeInTheDocument();
    expect(screen.queryByText("Processing boundary")).not.toBeInTheDocument();
    expect(screen.queryByText("Metadata")).not.toBeInTheDocument();
    expect(screen.queryByText("Before / After")).not.toBeInTheDocument();
  });

  it("does not render a separate job status card when an item is selected", () => {
    useMediaStore.setState({
      items: [createItem({ id: "sample", name: "sample.png" })],
      selectedId: "sample",
    });

    render(<MediaWorkspace />);

    expect(screen.queryByText("Job status")).not.toBeInTheDocument();
    expect(screen.queryByText("Processing")).not.toBeInTheDocument();
  });

  it("renders reference-style summary metrics", () => {
    useMediaStore.setState({
      items: [
        createItem({ id: "image-a", name: "image-a.png", type: "image", size: 1024 }),
        createItem({ id: "image-b", name: "image-b.png", type: "image", size: 2048, withResult: true }),
        createItem({ id: "video-a", name: "video-a.mp4", type: "video", size: 4096 }),
      ],
      selectedId: "image-a",
    });

    render(<MediaWorkspace />);

    expect(screen.getByTestId("metric-total")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-images")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-videos")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-selected")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-converted")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-input-total-size")).toHaveTextContent("7.0 KB");
    expect(screen.getByTestId("metric-output-total-size")).toHaveTextContent("512 B");

    fireEvent.click(screen.getByLabelText("Select image-a.png"));
    expect(screen.getByTestId("metric-selected")).toHaveTextContent("1");
  });

  it("keeps settings in an animated collapsible drawer", () => {
    render(<MediaWorkspace />);

    const drawer = screen.getByTestId("settings-drawer");
    const settingsButton = screen.getByRole("button", { name: "Open settings" });

    expect(drawer).toHaveAttribute("data-state", "closed");
    expect(settingsButton).toHaveAttribute("aria-pressed", "false");
    expect(settingsButton).toHaveClass("size-9", "border-white", "bg-white", "text-black");
    expect(settingsButton).not.toHaveTextContent("Settings");

    fireEvent.click(settingsButton);
    expect(drawer).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("button", { name: "Open settings" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Output naming")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(drawer).toHaveAttribute("data-state", "closed");
  });

  it("converts checked unconverted items before they become downloadable", async () => {
    useMediaStore.setState({
      items: [createItem({ id: "sample", name: "sample.png", type: "image" })],
      selectedId: "sample",
    });

    render(<MediaWorkspace />);

    fireEvent.click(screen.getByLabelText("Select sample.png"));
    expect(screen.getByRole("button", { name: "다운로드 (0)" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "변환 (1)" }));

    await waitFor(() => expect(processImageInBrowser).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "다운로드 (1)" })).toBeEnabled());
  });

  it("updates the uploaded item name from the source queue inline editor", () => {
    useMediaStore.setState({
      items: [createItem({ id: "sample", name: "sample.png", type: "image" })],
      selectedId: "sample",
    });

    render(<MediaWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Edit filename sample.png" }));
    const input = screen.getByLabelText("Rename sample.png");

    fireEvent.change(input, { target: { value: "renamed-source.png" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(useMediaStore.getState().items[0].name).toBe("renamed-source.png");
    expect(screen.getByRole("button", { name: "Edit filename renamed-source.png" })).toBeInTheDocument();
    expect(screen.getAllByText("renamed-source.png").length).toBeGreaterThan(1);
  });

  it("downloads a converted item with the renamed source filename", async () => {
    useMediaStore.setState({
      items: [createItem({ id: "sample", name: "sample.png", type: "image", withResult: true })],
      selectedId: "sample",
    });

    render(<MediaWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Edit filename sample.png" }));
    const input = screen.getByLabelText("Rename sample.png");

    fireEvent.change(input, { target: { value: "client-delivery.png" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByLabelText("Select client-delivery.png"));
    fireEvent.click(screen.getByRole("button", { name: "다운로드 (1)" }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "client-delivery.webp"));
  });

  it("updates a folder group name from the source queue inline editor", () => {
    useMediaStore.setState({
      items: [
        createItem({ id: "folder-a", name: "a.png", relativePath: "Trip/a.png" }),
        createItem({ id: "folder-b", name: "b.png", relativePath: "Trip/b.png" }),
      ],
      selectedId: "folder-a",
    });

    render(<MediaWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Edit folder name Trip" }));
    const input = screen.getByLabelText("Rename folder Trip");

    fireEvent.change(input, { target: { value: "Holiday" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const [firstItem, secondItem] = useMediaStore.getState().items;

    expect(screen.getByRole("button", { name: "Edit folder name Holiday" })).toBeInTheDocument();
    expect(getFileRelativePath(firstItem.file)).toBe("Holiday/a.png");
    expect(getFileRelativePath(secondItem.file)).toBe("Holiday/b.png");
  });

  it("uses folder group deletion and can clear the whole source queue", () => {
    useMediaStore.setState({
      items: [
        createItem({ id: "folder-a", name: "a.png", relativePath: "Trip/a.png" }),
        createItem({ id: "folder-b", name: "b.png", relativePath: "Trip/b.png" }),
        createItem({ id: "loose", name: "loose.png" }),
      ],
      selectedId: "folder-a",
    });

    render(<MediaWorkspace />);

    expect(screen.queryByRole("button", { name: "Delete selected folder" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete folder Trip" }));

    expect(useMediaStore.getState().items.map((item) => item.id)).toEqual(["loose"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear all source media" }));
    expect(useMediaStore.getState().items).toHaveLength(0);
  });

  it("keeps unsupported files in the source queue and scrolls to them from the warning", async () => {
    const unsupportedFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });

    render(<MediaWorkspace />);

    fireEvent.change(screen.getByLabelText("Upload image or video files"), {
      target: { files: [unsupportedFile] },
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Scroll to unsupported file notes.pdf" })).toBeInTheDocument());

    const [item] = useMediaStore.getState().items;

    expect(item.name).toBe("notes.pdf");
    expect(item.status).toBe("failed");
    expect(item.error?.code).toBe("unsupported_file_type");
    expect(screen.getByTestId(`media-row-${item.id}`)).toHaveClass("border-destructive");

    fireEvent.click(screen.getByRole("button", { name: "Scroll to unsupported file notes.pdf" }));

    expect(useMediaStore.getState().selectedId).toBe(item.id);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
  });

  it("pins the action bar on compact layouts and reserves bottom breathing room", () => {
    render(<MediaWorkspace />);

    expect(screen.getByTestId("media-main-panel")).toHaveClass("pb-[164px]", "xl:pb-0");
    expect(screen.getByTestId("download-panel")).toHaveClass(
      "fixed",
      "inset-x-3",
      "bottom-3",
      "z-40",
      "xl:static",
    );
  });

  it("keeps the compact source queue at a fixed height with an internal scroll list", () => {
    useMediaStore.setState({
      items: [createItem({ id: "sample", name: "sample.png" })],
      selectedId: "sample",
    });

    render(<MediaWorkspace />);

    expect(screen.getByTestId("source-panel")).toHaveClass("xl:h-full", "xl:min-h-0");
    expect(screen.getByTestId("source-queue-card")).toHaveClass(
      "h-[min(42svh,360px)]",
      "shrink-0",
      "overflow-hidden",
      "xl:h-auto",
      "xl:flex-1",
    );
  });

  it("uses the archive filename from settings for multi-result downloads", async () => {
    useMediaStore.setState({
      items: [
        createItem({ id: "ready-a", name: "ready-a.png", withResult: true }),
        createItem({ id: "ready-b", name: "ready-b.png", withResult: true }),
      ],
      selectedId: "ready-a",
      archiveName: "converted-media-results",
    });

    render(<MediaWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    fireEvent.change(screen.getByLabelText("Archive filename"), {
      target: { value: "client delivery" },
    });

    fireEvent.click(screen.getByLabelText("Select ready-a.png"));
    fireEvent.click(screen.getByLabelText("Select ready-b.png"));
    fireEvent.click(screen.getByRole("button", { name: "다운로드 (2)" }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "client delivery.zip"));
  });
});

function createItem({
  id,
  name,
  type = "image",
  size = 1,
  withResult = false,
  relativePath,
}: {
  id: string;
  name: string;
  type?: "image" | "video";
  size?: number;
  withResult?: boolean;
  relativePath?: string;
}) {
  const file = new File(["x"], name, { type: type === "image" ? "image/png" : "video/mp4" });

  if (relativePath) {
    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      value: relativePath,
    });
  }

  return {
    id,
    file,
    type,
    name,
    size,
    mimeType: type === "image" ? "image/png" : "video/mp4",
    objectUrl: `blob:${id}`,
    metadata:
      type === "image"
        ? {
            width: 100,
            height: 80,
            format: "png",
            hasAlpha: true,
          }
        : {
            width: 1920,
            height: 1080,
            duration: 10,
            fps: 30,
            hasAudio: true,
          },
    status: withResult ? "completed" : "idle",
    progress: withResult ? 100 : 25,
    result: withResult
      ? {
          blob: new Blob(["converted"], { type: type === "image" ? "image/webp" : "video/webm" }),
          objectUrl: `blob:${id}-result`,
          outputName: `${id}.${type === "image" ? "webp" : "webm"}`,
          size: 512,
          mimeType: type === "image" ? "image/webp" : "video/webm",
        }
      : undefined,
    warnings: [],
  } as UploadedMedia;
}

describe("MediaWorkspace - 미지원 파일 집계", () => {
  it("지원하지 않는 파일은 Images 집계에서 제외해야 한다", () => {
    // 미지원 파일은 확장자를 못 읽어 type이 image로 채워집니다(getFallbackMediaType).
    useMediaStore.setState({
      items: [
        {
          id: "ok",
          file: new File(["x"], "photo.png", { type: "image/png" }),
          type: "image",
          name: "photo.png",
          size: 10,
          mimeType: "image/png",
          objectUrl: "blob:ok",
          metadata: { width: 10, height: 10, format: "PNG" },
          status: "idle",
          progress: 0,
          warnings: [],
        },
        {
          id: "bad",
          file: new File(["x"], "notes.txt", { type: "text/plain" }),
          type: "image",
          name: "notes.txt",
          size: 5,
          mimeType: "text/plain",
          objectUrl: "",
          status: "failed",
          progress: 0,
          warnings: [],
          error: { code: "unsupported_file_type", message: "지원하지 않는 파일 형식입니다." },
        },
      ] as UploadedMedia[],
      selectedId: "ok",
    });

    render(<MediaWorkspace />);

    expect(screen.getByText("Images").closest("div")).toHaveTextContent("1");
    expect(screen.getByText("Total").closest("div")).toHaveTextContent("2");
  });
});
