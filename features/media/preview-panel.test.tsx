import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewPanel } from "./preview-panel";
import type { UploadedMedia } from "@/types/media";

describe("PreviewPanel", () => {
  it("renders before and after metadata below the preview panes", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    expect(screen.getByText("Before metadata")).toBeInTheDocument();
    expect(screen.getByText("After metadata")).toBeInTheDocument();
    expect(screen.getByText("640 x 480")).toBeInTheDocument();
    expect(screen.getByText("320 x 240")).toBeInTheDocument();
    expect(screen.getByText("sample-320x240.webp")).toBeInTheDocument();
  });

  it("shows an after metadata placeholder before conversion", () => {
    const item = createConvertedImage();
    delete item.result;

    render(<PreviewPanel item={item} />);

    expect(screen.getByText("변환 후 표시")).toBeInTheDocument();
  });

  it("supports zooming the preview media and returning to fit", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("110%")).toBeInTheDocument();
    expect(screen.getAllByAltText("sample.png")[0]).toHaveStyle({ width: "110%", height: "110%" });

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fit preview" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("allows preview zooming up to 1000 percent", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomIn = screen.getByRole("button", { name: "Zoom in" });

    for (let index = 0; index < 90; index += 1) {
      fireEvent.click(zoomIn);
    }

    expect(screen.getByText("1000%")).toBeInTheDocument();
    expect(zoomIn).toBeDisabled();
    expect(screen.getAllByAltText("sample.png")[0]).toHaveStyle({ width: "1000%", height: "1000%" });
  });

  it("pans zoomed preview media with pointer drag on both axes", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const frame = screen.getAllByTestId("media-preview-frame")[0];

    Object.defineProperty(frame, "scrollLeft", { configurable: true, value: 80, writable: true });
    Object.defineProperty(frame, "scrollTop", { configurable: true, value: 60, writable: true });

    firePointerDown(frame, { clientX: 200, clientY: 200 });
    firePointerMove(frame, { clientX: 160, clientY: 150 });
    fireEvent.pointerUp(frame);

    expect(frame.scrollLeft).toBe(120);
    expect(frame.scrollTop).toBe(110);
    expect(frame).toHaveClass("cursor-grab");
  });

  it("syncs original and result preview pan positions while zoomed", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const [originalFrame, resultFrame] = screen.getAllByTestId("media-preview-frame");

    setScrollState(originalFrame, {
      clientHeight: 400,
      clientWidth: 500,
      scrollHeight: 800,
      scrollLeft: 100,
      scrollTop: 80,
      scrollWidth: 1000,
    });
    setScrollState(resultFrame, {
      clientHeight: 800,
      clientWidth: 1000,
      scrollHeight: 1600,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 2000,
    });

    firePointerDown(originalFrame, { clientX: 200, clientY: 200 });
    firePointerMove(originalFrame, { clientX: 100, clientY: 150 });
    fireEvent.pointerUp(originalFrame);

    expect(originalFrame.scrollLeft).toBe(200);
    expect(originalFrame.scrollTop).toBe(130);
    expect(resultFrame.scrollLeft).toBe(400);
    expect(resultFrame.scrollTop).toBe(260);
  });

  it("keeps the empty preview canvas compact and internally scrollable on compact viewports", () => {
    render(<PreviewPanel />);

    expect(screen.getByTestId("empty-preview-panel")).toHaveClass(
      "h-[min(58svh,520px)]",
      "overflow-y-auto",
      "p-4",
      "xl:h-auto",
      "xl:flex-1",
    );
  });

  it("keeps uploaded preview content compact with scrollable media frames on compact viewports", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    expect(screen.getByTestId("preview-panel")).toHaveClass(
      "h-[min(54svh,520px)]",
      "min-h-[320px]",
      "overflow-hidden",
    );
    expect(screen.getByTestId("preview-pane-original")).toHaveClass(
      "h-[360px]",
      "overflow-hidden",
      "shrink-0",
      "xl:h-auto",
    );
    expect(screen.getByTestId("preview-pane-result")).toHaveClass(
      "h-[360px]",
      "overflow-hidden",
      "shrink-0",
      "xl:h-auto",
    );
    expect(screen.getByTestId("preview-pane-body-original")).toHaveClass("overflow-y-auto", "min-h-0");
    expect(screen.getByTestId("preview-pane-body-result")).toHaveClass("overflow-y-auto", "min-h-0");
    expect(screen.getAllByTestId("media-preview-frame")[0]).toHaveClass(
      "h-[220px]",
      "shrink-0",
      "overflow-auto",
      "xl:flex-1",
    );
  });
});

function firePointerMove(element: HTMLElement, init: { clientX: number; clientY: number }) {
  fireEvent(
    element,
    new MouseEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: init.clientX,
      clientY: init.clientY,
    }),
  );
}

function firePointerDown(element: HTMLElement, init: { clientX: number; clientY: number }) {
  fireEvent(
    element,
    new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: init.clientX,
      clientY: init.clientY,
    }),
  );
}

function setScrollState(
  element: HTMLElement,
  values: {
    clientHeight: number;
    clientWidth: number;
    scrollHeight: number;
    scrollLeft: number;
    scrollTop: number;
    scrollWidth: number;
  },
) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: values.clientHeight },
    clientWidth: { configurable: true, value: values.clientWidth },
    scrollHeight: { configurable: true, value: values.scrollHeight },
    scrollLeft: { configurable: true, value: values.scrollLeft, writable: true },
    scrollTop: { configurable: true, value: values.scrollTop, writable: true },
    scrollWidth: { configurable: true, value: values.scrollWidth },
  });
}

function createConvertedImage() {
  return {
    id: "image",
    file: new File(["x"], "sample.png", { type: "image/png" }),
    type: "image",
    name: "sample.png",
    size: 4096,
    mimeType: "image/png",
    objectUrl: "blob:sample",
    metadata: {
      width: 640,
      height: 480,
      format: "png",
      hasAlpha: true,
    },
    status: "completed",
    progress: 100,
    result: {
      blob: new Blob(["x"], { type: "image/webp" }),
      objectUrl: "blob:result",
      outputName: "sample-320x240.webp",
      size: 1024,
      mimeType: "image/webp",
      width: 320,
      height: 240,
      savedBytes: 0,
    },
    warnings: [],
  } as UploadedMedia;
}

describe("PreviewPanel - 변환 경고", () => {
  it("결과에 경고가 있으면 화면에 표시해야 한다", () => {
    const item = createConvertedImage();
    item.result = {
      ...item.result!,
      warnings: [{ code: "target_size_unreachable", message: "품질 40까지 낮춰도 목표 용량에 도달하지 못했습니다." }],
    };

    render(<PreviewPanel item={item} />);

    expect(screen.getByText(/목표 용량에 도달하지 못했습니다/)).toBeInTheDocument();
  });

  it("경고가 없으면 경고 영역을 그리지 않아야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    expect(screen.queryByText(/목표 용량에 도달하지 못했습니다/)).not.toBeInTheDocument();
  });
});
