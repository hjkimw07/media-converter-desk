import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageSettingsPanel } from "./image-settings-panel";
import type { ImageProcessOptions } from "@/types/media";

describe("ImageSettingsPanel", () => {
  it("toggles the width and height ratio link from the dimensions row", () => {
    const onChange = vi.fn();
    const options = createOptions();

    render(<ImageSettingsPanel options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle image aspect ratio link" }));

    expect(onChange).toHaveBeenCalledWith({
      resize: {
        ...options.resize,
        maintainAspectRatio: false,
      },
    });
  });

  it("AVIF를 출력 포맷으로 선택할 수 있어야 한다", () => {
    const onChange = vi.fn();

    render(<ImageSettingsPanel options={createOptions()} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Image output format"), { target: { value: "avif" } });

    expect(onChange).toHaveBeenCalledWith({ outputFormat: "avif" });
  });

  it("목표 용량 모드로 바꾸면 품질 슬라이더 대신 목표 용량 입력을 보여야 한다", () => {
    const onChange = vi.fn();
    const options = createOptions({ compression: { mode: "targetSize", targetSizeKb: 500, minQuality: 40 } });

    render(<ImageSettingsPanel options={options} onChange={onChange} />);

    expect(screen.getByLabelText("Target size KB")).toHaveValue(500);
    expect(screen.queryByLabelText(/^Quality/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target size KB"), { target: { value: "300" } });

    expect(onChange).toHaveBeenCalledWith({
      compression: { mode: "targetSize", targetSizeKb: 300, minQuality: 40 },
    });
  });

  it("무손실 PNG에 목표 용량을 지정하면 보장할 수 없다고 안내해야 한다", () => {
    const options = createOptions({
      outputFormat: "png",
      compression: { mode: "targetSize", targetSizeKb: 100, minQuality: 40 },
    });

    render(<ImageSettingsPanel options={options} onChange={vi.fn()} />);

    expect(screen.getByText(/PNG는 무손실이라 목표 용량을 보장할 수 없습니다/)).toBeInTheDocument();
  });
});

function createOptions(overrides: Partial<ImageProcessOptions> = {}): ImageProcessOptions {
  return {
    outputFormat: "webp",
    quality: 100,
    compression: {
      mode: "quality",
      minQuality: 40,
    },
    resize: {
      mode: "dimensions",
      width: 1280,
      height: 720,
      maintainAspectRatio: true,
    },
    backgroundColor: "#ffffff",
    stripMetadata: true,
    ...overrides,
  };
}
