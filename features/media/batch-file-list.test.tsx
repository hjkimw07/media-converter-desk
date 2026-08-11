import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchFileList } from "./batch-file-list";
import type { UploadedMedia } from "@/types/media";

describe("BatchFileList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("separates row selection from checkbox selection", () => {
    const onSelect = vi.fn();
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "sample.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={onSelect}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByLabelText("Select sample.png"));
    expect(onToggleChecked).toHaveBeenCalledWith("a");
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Open sample.png/ }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("selects a media row for preview without starting a reorder", () => {
    const onSelect = vi.fn();
    const onReorder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "first.png"), createItem("b", "second.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={onReorder}
        onSelect={onSelect}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.pointerDown(screen.getByTestId("media-row-a"));
    fireEvent.pointerEnter(screen.getByTestId("media-row-b"));
    fireEvent.pointerUp(screen.getByTestId("media-row-a"));
    fireEvent.click(screen.getByTestId("media-row-a"));

    expect(onReorder).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("allows renaming a source item by clicking its filename", () => {
    const onRename = vi.fn();
    const onSelect = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "sample.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onRename={onRename}
        onReorder={vi.fn()}
        onSelect={onSelect}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit filename sample.png" }));
    const input = screen.getByLabelText("Rename sample.png");

    fireEvent.change(input, { target: { value: "renamed.png" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRename).toHaveBeenCalledWith("a", "renamed.png");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("allows renaming a folder group by clicking its name", () => {
    const onRenameFolder = vi.fn();
    const onSelect = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onRenameFolder={onRenameFolder}
        onReorder={vi.fn()}
        onSelect={onSelect}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit folder name Trip" }));
    const input = screen.getByLabelText("Rename folder Trip");

    fireEvent.change(input, { target: { value: "Holiday" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameFolder).toHaveBeenCalledWith("Trip", "Holiday");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not commit an empty inline filename edit", () => {
    const onRename = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "sample.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onRename={onRename}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit filename sample.png" }));
    const input = screen.getByLabelText("Rename sample.png");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit filename sample.png" })).toBeInTheDocument();
  });

  it("renders all selection control and only enables row download after conversion", () => {
    const onToggleAll = vi.fn();
    const onDownload = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set(["a", "b"])}
        items={[createItem("a", "sample.png"), createItem("b", "ready.png", 100, true)]}
        onDownload={onDownload}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={onToggleAll}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(onToggleAll).toHaveBeenCalledWith(false);

    expect(screen.getByLabelText("Download sample.png")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Download sample.png"));
    expect(onDownload).not.toHaveBeenCalledWith("a");

    expect(screen.getByLabelText("Download ready.png")).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Download ready.png"));
    expect(onDownload).toHaveBeenCalledWith("b");
  });

  it("does not expose a converted item as a conversion status label", () => {
    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "sample.png", 42)]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.queryByText("IDLE")).not.toBeInTheDocument();
    expect(screen.queryByText("idle")).not.toBeInTheDocument();
  });

  it("calls row download only for converted items", () => {
    const onDownload = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "sample.png", 100, true)]}
        onDownload={onDownload}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByLabelText("Download sample.png"));
    expect(onDownload).toHaveBeenCalledWith("a");
  });

  it("renders drag handles and reports pointer-based reorder requests", () => {
    const onReorder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "first.png"), createItem("b", "second.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    mockElementDragTarget(screen.getByTestId("media-row-b"), { top: -100, height: 40 });
    fireEvent.pointerDown(screen.getByLabelText("Reorder first.png"));
    firePointerMove(screen.getByLabelText("Reorder first.png"), { clientX: 20, clientY: 132 });
    fireEvent.pointerUp(screen.getByLabelText("Reorder first.png"));

    expect(onReorder).toHaveBeenCalledWith("a", "b", "after");
  });

  it("reports upward pointer reorder requests from the drag handle", () => {
    const onReorder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "first.png"), createItem("b", "second.png"), createItem("c", "third.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="c"
      />,
    );

    mockElementDragTarget(screen.getByTestId("media-row-b"), { top: 100, height: 40 });
    fireEvent.pointerDown(screen.getByLabelText("Reorder third.png"));
    firePointerMove(screen.getByLabelText("Reorder third.png"), { clientX: 20, clientY: 104 });
    fireEvent.pointerUp(screen.getByLabelText("Reorder third.png"));

    expect(onReorder).toHaveBeenCalledWith("c", "b", "before");
  });

  it("does not start drag reorder from the regular row surface", () => {
    const onReorder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "first.png"), createItem("b", "second.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.pointerDown(screen.getByTestId("media-row-a"));
    fireEvent.pointerEnter(screen.getByTestId("media-row-b"));
    fireEvent.pointerUp(screen.getByTestId("media-row-a"));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does not start drag reorder from thumbnail and filename controls", () => {
    const onReorder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[createItem("a", "first.png"), createItem("b", "second.png")]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Open first.png" }));
    fireEvent.pointerEnter(screen.getByTestId("media-row-b"));
    fireEvent.pointerUp(screen.getByRole("button", { name: "Open first.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit filename first.png" }));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("groups folder uploads and exposes a folder delete action", () => {
    const onRemoveFolder = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
          createItem("c", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={onRemoveFolder}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    expect(screen.getByText("Trip")).toBeInTheDocument();
    expect(screen.getByText("2개 항목")).toBeInTheDocument();
    expect(screen.getByText("개별 파일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse folder Trip" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete folder Trip" }));
    expect(onRemoveFolder).toHaveBeenCalledWith("Trip");
  });

  it("keeps a collapsed folder group checkbox stable with custom mixed state", () => {
    render(
      <BatchFileList
        checkedIds={new Set(["a"])}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse folder Trip" }));

    const checkbox = screen.getByRole("checkbox", { name: "Select folder Trip" });
    expect(checkbox.tagName).toBe("BUTTON");
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(checkbox).toHaveClass("size-4");
    expect(screen.getByTestId("folder-checkbox-icon-Trip")).toHaveAttribute("data-state", "mixed");
  });

  it("renders folder drag handles and reports group reorder requests", () => {
    const onReorderGroup = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
          createItem("c", "work.png", 0, false, "Work/work.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onReorderGroup={onReorderGroup}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    mockElementDragTarget(screen.getByTestId("media-group-Work"), { top: -100, height: 80 });
    fireEvent.pointerDown(screen.getByLabelText("Reorder folder Trip"));
    firePointerMove(screen.getByLabelText("Reorder folder Trip"), { clientX: 20, clientY: 170 });
    fireEvent.pointerUp(screen.getByLabelText("Reorder folder Trip"));

    expect(onReorderGroup).toHaveBeenCalledWith("Trip", "Work", "after");
  });

  it("renders a drag handle for the loose file group", () => {
    const onReorderGroup = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onReorderGroup={onReorderGroup}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    mockElementDragTarget(screen.getByTestId("media-group-Trip"), { top: 100, height: 80 });
    fireEvent.pointerDown(screen.getByLabelText("Reorder group 개별 파일"));
    firePointerMove(screen.getByLabelText("Reorder group 개별 파일"), { clientX: 20, clientY: 104 });

    expect(onReorderGroup).toHaveBeenCalledWith("__loose_media__", "Trip", "before");
  });

  it("shows the folder icon only for folder-uploaded groups", () => {
    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    expect(screen.getByTestId("folder-group-icon-Trip")).toBeInTheDocument();
    expect(screen.queryByTestId("folder-group-icon-__loose_media__")).not.toBeInTheDocument();
  });

  it("collapses and expands folder-uploaded groups without deleting items", () => {
    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse folder Trip" }));
    expect(screen.queryByTestId("media-row-a")).not.toBeInTheDocument();
    expect(screen.queryByTestId("media-row-b")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand folder Trip" }));
    expect(screen.getByTestId("media-row-a")).toBeInTheDocument();
    expect(screen.getByTestId("media-row-b")).toBeInTheDocument();
  });

  it("collapses and expands the loose file group", () => {
    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse group 개별 파일" }));
    expect(screen.queryByTestId("media-row-b")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand group 개별 파일" }));
    expect(screen.getByTestId("media-row-b")).toBeInTheDocument();
  });

  it("selects only the items inside a folder group", () => {
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
          createItem("c", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select folder Trip" }));

    expect(onToggleChecked).toHaveBeenCalledTimes(2);
    expect(onToggleChecked).toHaveBeenCalledWith("a");
    expect(onToggleChecked).toHaveBeenCalledWith("b");
    expect(onToggleChecked).not.toHaveBeenCalledWith("c");
  });

  it("deselects only the items inside a fully selected folder group", () => {
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set(["a", "b"])}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
          createItem("c", "loose.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Deselect folder Trip" }));

    expect(onToggleChecked).toHaveBeenCalledTimes(2);
    expect(onToggleChecked).toHaveBeenCalledWith("a");
    expect(onToggleChecked).toHaveBeenCalledWith("b");
    expect(onToggleChecked).not.toHaveBeenCalledWith("c");
  });

  it("selects only the items inside the loose file group", () => {
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "loose-one.png"),
          createItem("c", "loose-two.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select group 개별 파일" }));

    expect(onToggleChecked).toHaveBeenCalledTimes(2);
    expect(onToggleChecked).toHaveBeenCalledWith("b");
    expect(onToggleChecked).toHaveBeenCalledWith("c");
    expect(onToggleChecked).not.toHaveBeenCalledWith("a");
  });

  it("deselects only the items inside a fully selected loose file group", () => {
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set(["b", "c"])}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "loose-one.png"),
          createItem("c", "loose-two.png"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Deselect group 개별 파일" }));

    expect(onToggleChecked).toHaveBeenCalledTimes(2);
    expect(onToggleChecked).toHaveBeenCalledWith("b");
    expect(onToggleChecked).toHaveBeenCalledWith("c");
    expect(onToggleChecked).not.toHaveBeenCalledWith("a");
  });

  it("shows indeterminate state when only some items in a folder are checked", () => {
    render(
      <BatchFileList
        checkedIds={new Set(["a"])}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select folder Trip" });
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByTestId("folder-checkbox-icon-Trip")).toHaveAttribute("data-state", "mixed");
  });

  it("checks all items when clicking an indeterminate group checkbox", () => {
    const onToggleChecked = vi.fn();

    render(
      <BatchFileList
        checkedIds={new Set(["a"])}
        items={[
          createItem("a", "photo.png", 0, false, "Trip/photo.png"),
          createItem("b", "clip.mp4", 0, false, "Trip/clip.mp4", "video"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={onToggleChecked}
        selectedId="a"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select folder Trip" }));

    expect(onToggleChecked).toHaveBeenCalledTimes(1);
    expect(onToggleChecked).toHaveBeenCalledWith("b");
  });

  it("renders source thumbnails and emphasizes MIME instead of a standalone media type tag", () => {
    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[
          createItem("image", "photo.png", 0, false, undefined, "image", "blob:photo", "image/jpeg"),
          createItem("video", "clip.mp4", 0, false, undefined, "video", "blob:clip"),
        ]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="image"
      />,
    );

    expect(screen.getByAltText("photo.png preview")).toHaveAttribute("src", "blob:photo");
    expect(screen.getByLabelText("clip.mp4 preview").tagName).toBe("VIDEO");
    expect(screen.queryByText("image")).not.toBeInTheDocument();
    expect(screen.getByTestId("mime-pill-image")).toHaveTextContent("image/jpeg");
  });

  it("marks unsupported failed files with a destructive row border", () => {
    const item = createItem("a", "notes.pdf", 0, false, undefined, "image", "", "application/pdf");

    item.status = "failed";
    item.error = {
      code: "unsupported_file_type",
      message: "지원하지 않는 파일 형식입니다.",
    };

    render(
      <BatchFileList
        checkedIds={new Set()}
        items={[item]}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleChecked={vi.fn()}
        selectedId="a"
      />,
    );

    expect(screen.getByTestId("media-row-a")).toHaveClass("border-destructive");
  });
});

function mockElementDragTarget(element: HTMLElement, rect: { top: number; height: number }) {
  if (!document.elementFromPoint) {
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(),
    });
  }

  vi.spyOn(document, "elementFromPoint").mockReturnValue(element);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: rect.top,
    top: rect.top,
    left: 0,
    right: 320,
    bottom: rect.top + rect.height,
    width: 320,
    height: rect.height,
    toJSON: () => ({}),
  } as DOMRect);
}

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

function createItem(
  id: string,
  name: string,
  progress = 0,
  withResult = false,
  relativePath?: string,
  type: "image" | "video" = "image",
  objectUrl = "blob:sample",
  mimeType = type === "image" ? "image/png" : "video/mp4",
) {
  const file = new File(["x"], name, { type: mimeType });

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
    size: 1,
    mimeType,
    objectUrl,
    status: withResult ? "completed" : "idle",
    progress,
    result: withResult
      ? {
          blob: new Blob(["x"], { type: "image/webp" }),
          objectUrl: "blob:result",
          outputName: "ready.webp",
          size: 1,
          mimeType: "image/webp",
        }
      : undefined,
    warnings: [],
  } as UploadedMedia;
}

describe("BatchFileList - 선택·삭제 액션 배치", () => {
  it("전체 선택 버튼에 아이콘이 있고 전체 삭제가 그 오른쪽에 와야 한다", () => {
    const onClearAll = vi.fn();

    render(
      <BatchFileList
        items={[createItem("a", "a.png")]}
        checkedIds={new Set()}
        onSelect={vi.fn()}
        onToggleChecked={vi.fn()}
        onToggleAll={vi.fn()}
        onClearAll={onClearAll}
        onReorder={vi.fn()}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
      />,
    );

    const selectAll = screen.getByRole("button", { name: "전체 선택" });
    const clearAll = screen.getByRole("button", { name: "Clear all source media" });

    expect(selectAll.querySelector("svg")).toBeInTheDocument();
    // 문서 순서상 전체 삭제가 전체 선택 뒤에 와야 합니다.
    expect(selectAll.compareDocumentPosition(clearAll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(clearAll);
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("항목이 없으면 선택·삭제 툴바를 그리지 않아야 한다", () => {
    render(
      <BatchFileList
        items={[]}
        checkedIds={new Set()}
        onSelect={vi.fn()}
        onToggleChecked={vi.fn()}
        onToggleAll={vi.fn()}
        onClearAll={vi.fn()}
        onReorder={vi.fn()}
        onDownload={vi.fn()}
        onRemove={vi.fn()}
        onRemoveFolder={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Clear all source media" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 선택" })).not.toBeInTheDocument();
  });
});
