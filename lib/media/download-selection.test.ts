import { describe, expect, it, vi } from "vitest";
import { collectDownloadableResults, getDownloadDeliveryMode } from "./download-selection";
import type { ProcessResult, UploadedMedia } from "@/types/media";

describe("download selection helpers", () => {
  it("chooses single file or zip delivery from checked result count", () => {
    expect(getDownloadDeliveryMode(0)).toBe("none");
    expect(getDownloadDeliveryMode(1)).toBe("single");
    expect(getDownloadDeliveryMode(2)).toBe("zip");
  });

  it("converts unfinished checked items before returning downloadable results", async () => {
    const converted = createResult("fresh.webp");
    const processItem = vi.fn(async () => converted);

    const results = await collectDownloadableResults([createItem("a", undefined)], processItem);

    expect(processItem).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }), 1);
    expect(results).toEqual([{ item: expect.objectContaining({ id: "a" }), result: converted }]);
  });

  it("uses completed results directly and skips busy items", async () => {
    const existing = createResult("ready.webp");
    const processItem = vi.fn(async () => createResult("unused.webp"));

    const results = await collectDownloadableResults(
      [createItem("ready", existing), createItem("busy", undefined, "processing")],
      processItem,
    );

    expect(processItem).not.toHaveBeenCalled();
    expect(results).toEqual([{ item: expect.objectContaining({ id: "ready" }), result: existing }]);
  });
});

function createItem(id: string, result?: ProcessResult, status: UploadedMedia["status"] = "idle") {
  return {
    id,
    file: new File(["x"], `${id}.png`, { type: "image/png" }),
    type: "image",
    name: `${id}.png`,
    size: 1,
    mimeType: "image/png",
    objectUrl: `blob:${id}`,
    status,
    progress: 0,
    result,
    warnings: [],
  } as UploadedMedia;
}

function createResult(outputName: string): ProcessResult {
  return {
    blob: new Blob(["converted"], { type: "image/webp" }),
    objectUrl: `blob:${outputName}`,
    outputName,
    size: 9,
    mimeType: "image/webp",
    width: 80,
    height: 40,
    savedBytes: 0,
  };
}
