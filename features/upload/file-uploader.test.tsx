import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileUploader } from "./file-uploader";
import { getMediaFolderKey } from "@/lib/media/folders";

describe("FileUploader", () => {
  it("renders the local-first upload guidance and forwards selected files", () => {
    const onFilesSelected = vi.fn();
    render(<FileUploader onFilesSelected={onFilesSelected} />);

    const input = screen.getByLabelText("Upload image or video files");
    const image = new File(["x"], "sample.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [image] } });

    expect(screen.getByText("Drop files or folders here")).toBeInTheDocument();
    expect(screen.queryByText("JPG PNG WEBP")).not.toBeInTheDocument();
    expect(screen.queryByText("MP4 WEBM")).not.toBeInTheDocument();
    expect(screen.queryByText("AVIF later")).not.toBeInTheDocument();
    expect(onFilesSelected).toHaveBeenCalledWith([image]);
  });

  it("디렉터리 선택기를 못 쓰는 브라우저에서는 폴더 input으로 돌아가야 한다", () => {
    render(<FileUploader onFilesSelected={vi.fn()} />);

    const folderInput = screen.getByLabelText("Upload a folder");

    expect(folderInput).toHaveAttribute("webkitdirectory");
    expect(folderInput).toHaveAttribute("directory");
  });

  it("filters hidden and system files from folder uploads", () => {
    const onFilesSelected = vi.fn();
    render(<FileUploader onFilesSelected={onFilesSelected} />);

    const folderInput = screen.getByLabelText("Upload a folder");
    const image = createFolderFile("photo.png", "Trip/photo.png");
    const dsStore = createFolderFile(".DS_Store", "Trip/.DS_Store");
    const thumbsDb = createFolderFile("Thumbs.db", "Trip/Thumbs.db");
    const desktopIni = createFolderFile("desktop.ini", "Trip/desktop.ini");
    const gitkeep = createFolderFile(".gitkeep", "Trip/.gitkeep");

    fireEvent.change(folderInput, { target: { files: [image, dsStore, thumbsDb, desktopIni, gitkeep] } });

    expect(onFilesSelected).toHaveBeenCalledTimes(1);
    const passedFiles = onFilesSelected.mock.calls[0][0];
    expect(passedFiles).toHaveLength(1);
    expect(passedFiles[0].name).toBe("photo.png");
  });

  it("marks each folder picker selection as a separate group", () => {
    const onFilesSelected = vi.fn();
    render(<FileUploader onFilesSelected={onFilesSelected} />);

    const folderInput = screen.getByLabelText("Upload a folder");
    const first = createFolderFile("a.png", "Trip/a.png");
    const second = createFolderFile("b.png", "Trip/b.png");

    fireEvent.change(folderInput, { target: { files: [first] } });
    fireEvent.change(folderInput, { target: { files: [second] } });

    const firstSelection = onFilesSelected.mock.calls[0][0];
    const secondSelection = onFilesSelected.mock.calls[1][0];

    expect(getMediaFolderKey(firstSelection[0])).not.toEqual(getMediaFolderKey(secondSelection[0]));
  });
});

describe("FileUploader - 디렉터리 선택기", () => {
  afterEach(() => {
    delete (window as DirectoryPickerWindow).showDirectoryPicker;
  });

  function mockDirectoryPicker(handle: unknown) {
    const showDirectoryPicker = vi.fn().mockResolvedValue(handle);

    (window as DirectoryPickerWindow).showDirectoryPicker = showDirectoryPicker;

    return showDirectoryPicker;
  }

  it("지원하는 브라우저에서는 확인창 없는 버튼을 그려야 한다", () => {
    mockDirectoryPicker(createDirectoryHandle("Trip", []));

    render(<FileUploader onFilesSelected={vi.fn()} />);

    const folderControl = screen.getByLabelText("Upload a folder");

    expect(folderControl.tagName).toBe("BUTTON");
    expect(folderControl).not.toHaveAttribute("webkitdirectory");
  });

  it("하위 폴더까지 훑어 상대경로를 붙이고 숨김 파일은 걸러야 한다", async () => {
    const onFilesSelected = vi.fn();

    mockDirectoryPicker(
      createDirectoryHandle("Trip", [
        createFileHandle("photo.png"),
        createFileHandle(".DS_Store"),
        createFileHandle("Thumbs.db"),
        createDirectoryHandle("nested", [createFileHandle("clip.png")]),
      ]),
    );

    render(<FileUploader onFilesSelected={onFilesSelected} />);
    fireEvent.click(screen.getByLabelText("Upload a folder"));

    await waitFor(() => expect(onFilesSelected).toHaveBeenCalledOnce());

    const files = onFilesSelected.mock.calls[0][0] as File[];

    expect(files.map((file) => file.name)).toEqual(["photo.png", "clip.png"]);
    expect(files.map((file) => (file as File & { webkitRelativePath: string }).webkitRelativePath)).toEqual([
      "Trip/photo.png",
      "Trip/nested/clip.png",
    ]);
    expect(getMediaFolderKey(files[0])).toBe(getMediaFolderKey(files[1]));
  });

  it("선택을 취소하면 아무 파일도 넘기지 않아야 한다", async () => {
    const onFilesSelected = vi.fn();
    const showDirectoryPicker = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));

    (window as DirectoryPickerWindow).showDirectoryPicker = showDirectoryPicker;

    render(<FileUploader onFilesSelected={onFilesSelected} />);
    fireEvent.click(screen.getByLabelText("Upload a folder"));

    await waitFor(() => expect(showDirectoryPicker).toHaveBeenCalledOnce());
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});

type DirectoryPickerWindow = Window & { showDirectoryPicker?: unknown };

function createDirectoryHandle(name: string, children: unknown[]) {
  return {
    kind: "directory",
    name,
    values: async function* () {
      for (const child of children) {
        yield child;
      }
    },
  };
}

function createFileHandle(name: string) {
  return {
    kind: "file",
    name,
    getFile: async () => new File(["x"], name, { type: "image/png" }),
  };
}

function createFolderFile(name: string, relativePath: string) {
  const file = new File(["x"], name, { type: "image/png" });

  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  });

  return file;
}
