import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStore } from "./media-store";
import type { UploadedMedia } from "@/types/media";

describe("useMediaStore", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    useMediaStore.setState({
      items: [],
      selectedId: undefined,
    });
  });

  it("normalizes result size from the downloadable blob size", () => {
    const blob = new Blob(["actual-download-bytes"], { type: "image/webp" });
    const item = {
      id: "sample",
      file: new File(["x"], "sample.png", { type: "image/png" }),
      type: "image",
      name: "sample.png",
      size: 1024,
      mimeType: "image/png",
      objectUrl: "blob:sample",
      status: "idle",
      progress: 0,
      warnings: [],
    } as UploadedMedia;

    useMediaStore.setState({ items: [item], selectedId: "sample" });
    useMediaStore.getState().setResult("sample", {
      blob,
      objectUrl: "blob:result",
      outputName: "sample.webp",
      size: 1,
      mimeType: "image/webp",
      savedBytes: 0,
    });

    expect(useMediaStore.getState().items[0].result?.size).toBe(blob.size);
  });

  it("keeps a renamed converted item downloadable with the renamed filename", () => {
    const blob = new Blob(["converted"], { type: "image/webp" });
    const item = {
      id: "sample",
      file: new File(["x"], "sample.png", { type: "image/png" }),
      type: "image",
      name: "sample.png",
      size: 1024,
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
        blob,
        objectUrl: "blob:result",
        outputName: "sample.webp",
        size: blob.size,
        mimeType: "image/webp",
        width: 320,
        height: 240,
        savedBytes: 0,
      },
      warnings: [],
    } as UploadedMedia;

    useMediaStore.setState({ items: [item], selectedId: "sample" });
    useMediaStore.getState().updateItemName("sample", "client-delivery.png");

    const renamedItem = useMediaStore.getState().items[0];

    expect(renamedItem.name).toBe("client-delivery.png");
    expect(renamedItem.result?.outputName).toBe("client-delivery.webp");
  });
});
