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

    const zoomInput = screen.getByLabelText("Zoom percent");

    expect(zoomInput).toHaveValue("100");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomInput).toHaveValue("110");
    expect(screen.getAllByAltText("sample.png")[0]).toHaveStyle({ width: "110%", height: "110%" });

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(zoomInput).toHaveValue("100");

    fireEvent.click(screen.getByRole("button", { name: "Fit preview" }));
    expect(zoomInput).toHaveValue("100");
  });

  it("큰 조정 버튼은 100%p씩 움직여야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in by 100 percent" }));
    expect(zoomInput).toHaveValue("200");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in by 100 percent" }));
    expect(zoomInput).toHaveValue("300");

    fireEvent.click(screen.getByRole("button", { name: "Zoom out by 100 percent" }));
    expect(zoomInput).toHaveValue("200");

    // 미세 조정(10%p)보다 크게 움직여야 한다.
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomInput).toHaveValue("210");
  });

  it("확대율을 직접 입력하면 미리보기에 반영해야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.change(zoomInput, { target: { value: "325" } });
    fireEvent.blur(zoomInput);

    expect(zoomInput).toHaveValue("325");
    expect(screen.getAllByAltText("sample.png")[0]).toHaveStyle({ width: "325%", height: "325%" });
  });

  it("허용 범위를 벗어난 입력은 잘라내야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.change(zoomInput, { target: { value: "9999" } });
    fireEvent.blur(zoomInput);
    expect(zoomInput).toHaveValue("1000");

    fireEvent.change(zoomInput, { target: { value: "1" } });
    fireEvent.blur(zoomInput);
    expect(zoomInput).toHaveValue("50");
  });

  it("입력을 비우고 포커스를 잃으면 직전 배율을 유지해야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.change(zoomInput, { target: { value: "" } });
    fireEvent.blur(zoomInput);

    expect(zoomInput).toHaveValue("110");
  });

  it("allows preview zooming up to 1000 percent", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomIn = screen.getByRole("button", { name: "Zoom in" });

    for (let index = 0; index < 90; index += 1) {
      fireEvent.click(zoomIn);
    }

    expect(screen.getByLabelText("Zoom percent")).toHaveValue("1000");
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

  it("확대하면 두 프레임의 스크롤을 중앙 기준으로 다시 잡아야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const [originalFrame, resultFrame] = screen.getAllByTestId("media-preview-frame");
    const frameSize = {
      clientHeight: 200,
      clientWidth: 400,
      scrollHeight: 200,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 400,
    };

    setScrollState(originalFrame, frameSize);
    setScrollState(resultFrame, frameSize);

    // 100% → 200%. 중앙(내용 좌표 200·100)이 두 배가 되므로 그만큼 스크롤이 밀려야 한다.
    fireEvent.click(screen.getByRole("button", { name: "Zoom in by 100 percent" }));

    expect(originalFrame.scrollLeft).toBe(200);
    expect(originalFrame.scrollTop).toBe(100);
    expect(resultFrame.scrollLeft).toBe(200);
    expect(resultFrame.scrollTop).toBe(100);
  });

  it("축소해서 원래 크기로 돌아오면 스크롤이 처음 위치로 돌아와야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const [originalFrame] = screen.getAllByTestId("media-preview-frame");

    setScrollState(originalFrame, {
      clientHeight: 200,
      clientWidth: 400,
      scrollHeight: 200,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 400,
    });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in by 100 percent" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out by 100 percent" }));

    expect(originalFrame.scrollLeft).toBe(0);
    expect(originalFrame.scrollTop).toBe(0);
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

  it("데스크탑에서는 빈 상태 안내 문장을 한 줄로 둬야 한다", () => {
    render(<PreviewPanel />);

    expect(
      screen.getByText("이미지 또는 짧은 영상을 추가하면 원본과 변환 결과를 같은 캔버스에서 비교합니다."),
    ).toHaveClass("xl:whitespace-nowrap");
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

describe("PreviewPanel - 키보드 배율 단축키", () => {
  it("-, + 키를 누르면 배율이 10%p씩 움직여야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.keyDown(window, { key: "+" });
    expect(zoomInput).toHaveValue("110");

    fireEvent.keyDown(window, { key: "-" });
    fireEvent.keyDown(window, { key: "-" });
    expect(zoomInput).toHaveValue("90");
  });

  it("한글 입력 상태처럼 key 값이 달라도 키 위치로 동작해야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    // 입력기가 켜져 있으면 key로 "+" 대신 "Process"가 오기도 합니다.
    fireEvent.keyDown(window, { code: "Equal", key: "Process" });
    expect(zoomInput).toHaveValue("110");

    fireEvent.keyDown(window, { code: "Minus", key: "Process" });
    expect(zoomInput).toHaveValue("100");

    fireEvent.keyDown(window, { code: "NumpadAdd", key: "Process" });
    expect(zoomInput).toHaveValue("110");
  });

  it("Shift와 함께 누르면 100%p씩 움직여야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.keyDown(window, { code: "Equal", key: "+", shiftKey: true });
    expect(zoomInput).toHaveValue("200");

    fireEvent.keyDown(window, { code: "Minus", key: "_", shiftKey: true });
    expect(zoomInput).toHaveValue("100");

    // Shift 없이는 그대로 미세 조정이어야 한다.
    fireEvent.keyDown(window, { code: "Equal", key: "=" });
    expect(zoomInput).toHaveValue("110");
  });

  it("Shift 조정도 허용 범위를 넘지 않아야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.keyDown(window, { code: "Minus", key: "_", shiftKey: true });

    expect(zoomInput).toHaveValue("50");
  });

  it("단축키로 바뀐 배율이 원본과 결과 이미지에 모두 적용돼야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    fireEvent.keyDown(window, { code: "Equal", key: "+" });

    const previews = screen.getAllByAltText("sample.png");

    expect(previews).toHaveLength(2);
    previews.forEach((preview) => expect(preview).toHaveStyle({ width: "110%", height: "110%" }));
  });

  it("배율 입력 칸에서 누른 -, + 는 배율을 바꾸지 않아야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.keyDown(zoomInput, { code: "Equal", key: "+" });

    expect(zoomInput).toHaveValue("100");
  });

  it("Ctrl·⌘ 조합은 브라우저 확대라 가로채지 않아야 한다", () => {
    render(<PreviewPanel item={createConvertedImage()} />);

    const zoomInput = screen.getByLabelText("Zoom percent");

    fireEvent.keyDown(window, { code: "Equal", ctrlKey: true, key: "+" });
    fireEvent.keyDown(window, { code: "Minus", key: "-", metaKey: true });

    expect(zoomInput).toHaveValue("100");
  });

  it("미리보기가 비어 있으면 단축키가 동작하지 않아야 한다", () => {
    render(<PreviewPanel />);

    fireEvent.keyDown(window, { key: "+" });

    expect(screen.queryByLabelText("Zoom percent")).not.toBeInTheDocument();
  });
});

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
