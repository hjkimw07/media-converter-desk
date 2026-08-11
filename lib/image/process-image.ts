import { encodeInWorker } from "@/lib/image/encode-client";
import { MIME_BY_IMAGE_FORMAT, isLossyFormat } from "@/lib/image/encoders";
import { NO_GAIN_WARNING, shouldKeepOriginal } from "@/lib/media/compression";
import { createOutputFilename } from "@/lib/media/filenames";
import { resolveResizeDimensions } from "@/lib/media/resize";
import type { ImageMetadata, ImageProcessOptions, MediaWarning, ProcessResult } from "@/types/media";

const BYTES_PER_KB = 1024;
const MAX_QUALITY = 100;

export async function processImageInBrowser(
  file: File,
  options: ImageProcessOptions,
  metadata: ImageMetadata,
  onProgress: (progress: number) => void,
): Promise<ProcessResult> {
  onProgress(12);
  const bitmap = await decodeImageForCanvas(file);
  const dimensions = resolveResizeDimensions(metadata.width, metadata.height, options.resize);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: options.outputFormat !== "jpg" });

  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  onProgress(35);

  if (options.outputFormat === "jpg") {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
  closeBitmap(bitmap);
  onProgress(72);

  const mimeType = MIME_BY_IMAGE_FORMAT[options.outputFormat];
  const encoded = await encodeForOptions(context.getImageData(0, 0, canvas.width, canvas.height), options);
  const warnings = [...encoded.warnings];

  const useOriginal = shouldKeepOriginal({
    originalName: file.name,
    originalSize: file.size,
    encodedSize: encoded.blob.size,
    outputFormat: options.outputFormat,
    resizeMode: options.resize.mode,
  });

  if (useOriginal) {
    warnings.push(NO_GAIN_WARNING);
  }

  const blob = useOriginal ? file : encoded.blob;
  const objectUrl = URL.createObjectURL(blob);

  onProgress(100);

  return {
    blob,
    objectUrl,
    outputName: createOutputFilename({
      originalName: file.name,
      format: options.outputFormat,
      width: dimensions.width,
      height: dimensions.height,
    }),
    size: blob.size,
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
    savedBytes: file.size - blob.size,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

type EncodeOutcome = { blob: Blob; warnings: MediaWarning[] };

/**
 * 압축 모드에 따라 픽셀을 인코딩합니다. 실제 인코딩은 Worker에서 수행됩니다.
 * targetSize 모드는 품질 이진 탐색을 돌리고, 무손실 포맷이면 탐색 없이 1회만 인코딩합니다.
 */
async function encodeForOptions(imageData: ImageData, options: ImageProcessOptions): Promise<EncodeOutcome> {
  const { compression, outputFormat } = options;
  const useTargetSize = compression.mode === "targetSize" && compression.targetSizeKb !== undefined;
  const targetBytes = (compression.targetSizeKb ?? 0) * BYTES_PER_KB;

  const { blob, reachedTarget } = await encodeInWorker({
    imageData,
    format: outputFormat,
    quality: useTargetSize ? MAX_QUALITY : options.quality,
    target: useTargetSize ? { targetBytes, minQuality: compression.minQuality } : undefined,
  });

  if (!useTargetSize) {
    return { blob, warnings: [] };
  }

  if (!isLossyFormat(outputFormat)) {
    return {
      blob,
      warnings:
        blob.size > targetBytes
          ? [
              {
                code: "target_size_lossless",
                message: `${outputFormat.toUpperCase()}는 무손실 포맷이라 목표 용량을 보장할 수 없습니다. 손실 포맷이나 리사이즈를 사용해 주세요.`,
              },
            ]
          : [],
    };
  }

  return {
    blob,
    warnings: reachedTarget
      ? []
      : [
          {
            code: "target_size_unreachable",
            message: `품질 ${compression.minQuality}까지 낮춰도 목표 용량에 도달하지 못했습니다. 해상도를 줄이거나 목표를 높여 주세요.`,
          },
        ],
  };
}

export async function decodeImageForCanvas(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in globalThis) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some browser builds fail createImageBitmap for files that HTMLImageElement can still render.
    }
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to decode image."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap) {
    bitmap.close();
  }
}
