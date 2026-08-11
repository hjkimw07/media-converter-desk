"use client";

import { FolderUp, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_MEDIA_MIME_TYPES } from "@/constants/media";
import { markFilesAsFolderUpload, markFolderSelectionFiles } from "@/lib/media/folders";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  onFilesSelected: (files: File[]) => void;
};

type FileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
};

type FileSystemFileEntry = FileSystemEntry & {
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
};

type FileSystemDirectoryEntry = FileSystemEntry & {
  createReader: () => {
    readEntries: (success: (entries: FileSystemEntry[]) => void, error?: (error: DOMException) => void) => void;
  };
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

export function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const submitFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const submitFolderFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = markFolderSelectionFiles(Array.from(fileList).filter((file) => !isHiddenOrSystemFile(file)));

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const submitDroppedItems = useCallback(
    async (dataTransfer: DataTransfer) => {
      const files = await collectDataTransferFiles(dataTransfer);

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  return (
    <section
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void submitDroppedItems(event.dataTransfer);
      }}
      className={cn(
        "rounded-md border border-dashed hairline-dashed bg-card p-3 transition-[border-color,background-color] duration-200",
        isDragging && "border-primary bg-secondary",
      )}
    >
      <div className="flex min-h-44 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-primary/50 bg-secondary/35 p-4 text-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-primary">
          <UploadCloud aria-hidden="true" />
        </div>
        <div className="flex max-w-[260px] flex-col gap-1">
          <h2 className="text-base font-semibold leading-6">Drop files or folders here</h2>
          <p className="text-sm leading-5 text-muted-foreground">이미지와 짧은 영상을 드래그하거나 아래 버튼으로 추가하세요.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <input
                aria-label="Upload image or video files"
                className="sr-only"
                type="file"
                accept={ACCEPTED_MEDIA_MIME_TYPES}
                multiple
                onChange={(event) => {
                  submitFiles(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                }}
              />
              <UploadCloud data-icon="inline-start" />
              Files
            </label>
          </Button>
          <Button asChild variant="secondary">
            <label className="cursor-pointer">
              <input
                aria-label="Upload a folder"
                className="sr-only"
                type="file"
                multiple
                {...{ directory: "", webkitdirectory: "" }}
                onChange={(event) => {
                  submitFolderFiles(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                }}
              />
              <FolderUp data-icon="inline-start" />
              Folder
            </label>
          </Button>
        </div>
      </div>
    </section>
  );
}

async function collectDataTransferFiles(dataTransfer: DataTransfer) {
  const items = Array.from(dataTransfer.items ?? []) as DataTransferItemWithEntry[];
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];

  if (entries.length === 0) {
    return Array.from(dataTransfer.files ?? []);
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryFiles = await readEntryFiles(entry);

      if (entry.isDirectory) {
        return markFilesAsFolderUpload(entryFiles, { label: entry.name });
      }

      return entryFiles;
    }),
  );

  return files.flat();
}

async function readEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    if (isHiddenOrSystemEntry(entry.name)) {
      return [];
    }

    return [await readFileEntry(entry as FileSystemFileEntry)];
  }

  if (entry.isDirectory) {
    if (entry.name.startsWith(".") || entry.name === "__MACOSX") {
      return [];
    }

    const entries = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
    const files = await Promise.all(entries.map((childEntry) => readEntryFiles(childEntry)));

    return files.flat();
  }

  return [];
}

function readFileEntry(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => {
    entry.file((file) => resolve(withRelativePath(file, entry.fullPath)), reject);
  });
}

function readDirectoryEntries(entry: FileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const entries: FileSystemEntry[] = [];

  return new Promise<FileSystemEntry[]>((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }

        entries.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  });
}

function isHiddenOrSystemFile(file: File) {
  return isHiddenOrSystemEntry(file.name);
}

function isHiddenOrSystemEntry(name: string) {
  return name.startsWith(".") || name === "Thumbs.db" || name === "desktop.ini";
}

function withRelativePath(file: File, fullPath?: string) {
  const relativePath = fullPath?.replace(/^\/+/, "");

  if (!relativePath || (file as File & { webkitRelativePath?: string }).webkitRelativePath) {
    return file;
  }

  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: relativePath,
      configurable: true,
    });
  } catch {
    // Some browsers expose File as non-extensible; conversion still works without folder paths.
  }

  return file;
}
