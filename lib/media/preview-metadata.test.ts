import { describe, expect, it } from "vitest";
import { buildPreviewMetadata } from "./preview-metadata";
import type { UploadedMedia } from "@/types/media";

describe("buildPreviewMetadata", () => {
  it("returns before and after metadata rows for converted images", () => {
    const metadata = buildPreviewMetadata(createImageItem(true));
    const labels = ["File Name", "File Size", "Format", "MIME", "Dimensions", "Alpha", "Change"];

    expect(metadata.before).toEqual([
      { label: "File Name", value: "sample.png" },
      { label: "File Size", value: "4.0 KB (4,096 bytes)" },
      { label: "Format", value: "PNG" },
      { label: "MIME", value: "image/png" },
      { label: "Dimensions", value: "640 x 480" },
      { label: "Alpha", value: "Likely" },
      { label: "Change", value: "Original" },
    ]);
    expect(metadata.after).toEqual([
      { label: "File Name", value: "sample-320x240.webp" },
      { label: "File Size", value: "1.1 KB (1,153 bytes)" },
      { label: "Format", value: "WEBP" },
      { label: "MIME", value: "image/webp" },
      { label: "Dimensions", value: "320 x 240" },
      { label: "Alpha", value: "Unknown" },
      { label: "Change", value: "71.9% smaller" },
    ]);
    expect(metadata.before.map((row) => row.label)).toEqual(labels);
    expect(metadata.after.map((row) => row.label)).toEqual(labels);
  });

  it("keeps the same after metadata order before conversion", () => {
    const metadata = buildPreviewMetadata(createImageItem(false));

    expect(metadata.after.map((row) => row.label)).toEqual(metadata.before.map((row) => row.label));
    expect(metadata.after).toEqual([
      { label: "File Name", value: "변환 후 표시" },
      { label: "File Size", value: "-" },
      { label: "Format", value: "-" },
      { label: "MIME", value: "-" },
      { label: "Dimensions", value: "-" },
      { label: "Alpha", value: "-" },
      { label: "Change", value: "-" },
    ]);
  });

  it("keeps the same metadata order for converted videos", () => {
    const metadata = buildPreviewMetadata(createVideoItem());
    const labels = ["File Name", "File Size", "Format", "MIME", "Dimensions", "Duration", "FPS", "Audio", "Change"];

    expect(metadata.before.map((row) => row.label)).toEqual(labels);
    expect(metadata.after.map((row) => row.label)).toEqual(labels);
    expect(metadata.before).toContainEqual({ label: "Duration", value: "0:12" });
    expect(metadata.after).toContainEqual({ label: "Duration", value: "0:12" });
    expect(metadata.before).toContainEqual({ label: "Format", value: "MP4" });
    expect(metadata.after).toContainEqual({ label: "Format", value: "WEBM" });
  });
});

function createImageItem(withResult: boolean) {
  return {
    id: "image",
    file: new File(["x".repeat(4096)], "sample.png", { type: "image/png" }),
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
    status: withResult ? "completed" : "idle",
    progress: withResult ? 100 : 0,
    result: withResult
      ? {
          blob: new Blob(["x".repeat(1153)], { type: "image/webp" }),
          objectUrl: "blob:result",
          outputName: "sample-320x240.webp",
          size: 1153,
          mimeType: "image/webp",
          width: 320,
          height: 240,
        }
      : undefined,
    warnings: [],
  } as UploadedMedia;
}

function createVideoItem() {
  return {
    id: "video",
    file: new File(["x"], "clip.mp4", { type: "video/mp4" }),
    type: "video",
    name: "clip.mp4",
    size: 2048,
    mimeType: "video/mp4",
    objectUrl: "blob:clip",
    metadata: {
      width: 1920,
      height: 1080,
      duration: 12,
      fps: 30,
      hasAudio: true,
    },
    status: "completed",
    progress: 100,
    result: {
      blob: new Blob(["x"], { type: "video/webm" }),
      objectUrl: "blob:result",
      outputName: "clip.webm",
      size: 1024,
      mimeType: "video/webm",
      width: 1280,
      height: 720,
      duration: 12,
      savedBytes: 0,
    },
    warnings: [],
  } as UploadedMedia;
}
