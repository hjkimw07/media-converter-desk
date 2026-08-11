import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoSettingsPanel } from "./video-settings-panel";
import type { VideoProcessOptions } from "@/types/media";

describe("VideoSettingsPanel", () => {
  it("toggles the width and height ratio link from the dimensions row", () => {
    const onChange = vi.fn();
    const options = createOptions();

    render(<VideoSettingsPanel options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle video aspect ratio link" }));

    expect(onChange).toHaveBeenCalledWith({
      resize: {
        ...options.resize,
        maintainAspectRatio: false,
      },
    });
  });
});

function createOptions(): VideoProcessOptions {
  return {
    outputFormat: "mp4",
    videoCodec: "h264",
    bitrateKbps: 1600,
    crf: 26,
    audio: {
      mode: "keep",
      bitrateKbps: 128,
    },
    resize: {
      mode: "dimensions",
      width: 1280,
      height: 720,
      maintainAspectRatio: true,
    },
  };
}

describe("VideoSettingsPanel - 압축 옵션", () => {
  it("mp4에서 H.265 코덱을 선택할 수 있어야 한다", () => {
    const onChange = vi.fn();

    render(<VideoSettingsPanel options={createOptions()} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Video codec"), { target: { value: "h265" } });

    expect(onChange).toHaveBeenCalledWith({ videoCodec: "h265" });
  });

  it("WEBM 출력은 브라우저 인코더가 지원하지 않아 선택할 수 없어야 한다", () => {
    render(<VideoSettingsPanel options={createOptions()} onChange={vi.fn()} />);

    const webmOption = screen.getByRole("option", { name: /WEBM/ });

    expect(webmOption).toBeDisabled();
  });

  it("오디오 제거를 선택하면 비트레이트 입력을 숨겨야 한다", () => {
    const options = { ...createOptions(), audio: { mode: "remove" as const } };

    render(<VideoSettingsPanel options={options} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("Audio bitrate kbps")).not.toBeInTheDocument();
  });

  it("목표 용량을 입력하면 CRF/Bitrate 입력을 숨겨야 한다", () => {
    const options = { ...createOptions(), targetSizeKb: 5120 };

    render(<VideoSettingsPanel options={options} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Video target size KB")).toHaveValue(5120);
    expect(screen.queryByLabelText("CRF")).not.toBeInTheDocument();
  });
});
