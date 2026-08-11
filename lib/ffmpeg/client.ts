import { buildVideoConvertArgs, resolveCodecForFormat } from "@/lib/ffmpeg/arguments";
import { NO_GAIN_WARNING, shouldKeepOriginal } from "@/lib/media/compression";
import { createOutputFilename } from "@/lib/media/filenames";
import { resolveResizeDimensions } from "@/lib/media/resize";
import { getExtension } from "@/lib/validation/media-validation";
import type { ProcessResult, VideoMetadata, VideoProcessOptions } from "@/types/media";


/**
 * 단일스레드 코어로 고정합니다.
 * 멀티스레드 코어(@ffmpeg/core-mt)는 격리된 하니스에서 H.264 인코딩이 약 9배 빨랐지만,
 * 이 앱의 번들 환경에서는 pthread 기동 시 "function signature mismatch"로 죽습니다
 * (umd/esm 빌드 모두 재현). 원인 규명 전까지 안정적인 단일스레드를 유지합니다.
 */
const FFMPEG_CORE_VERSION = "0.12.10";

const MIME_BY_FORMAT = {
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
let ffmpegLoadPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;
let lastFfmpegLog = "";

export async function processVideoInBrowser(
  file: File,
  options: VideoProcessOptions,
  metadata: VideoMetadata,
  onProgress: (progress: number) => void,
): Promise<ProcessResult> {
  const ffmpeg = await getFfmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");
  const inputExtension = getExtension(file.name) || "input";
  const inputName = `input.${inputExtension}`;
  const outputName = `output.${options.outputFormat}`;
  const dimensions = resolveResizeDimensions(metadata.width, metadata.height, options.resize);
  const resolvedOptions: VideoProcessOptions = {
    ...options,
    videoCodec: resolveCodecForFormat(options.outputFormat, options.videoCodec),
    resize:
      options.resize.mode === "original"
        ? options.resize
        : {
            ...options.resize,
            width: dimensions.width,
            height: dimensions.height,
          },
  };

  onProgress(8);
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  onProgress(18);

  const exitCode = await ffmpeg.exec(
    buildVideoConvertArgs({
      ...resolvedOptions,
      inputName,
      outputName,
      durationSeconds: metadata.duration,
    }),
  );

  if (exitCode !== 0) {
    throw new Error(`FFmpeg exited with code ${exitCode}${lastFfmpegLog ? `: ${lastFfmpegLog}` : ""}`);
  }

  const data = await ffmpeg.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const encoded = new Blob([bytes], { type: MIME_BY_FORMAT[options.outputFormat] });

  const useOriginal = shouldKeepOriginal({
    originalName: file.name,
    originalSize: file.size,
    encodedSize: encoded.size,
    outputFormat: options.outputFormat,
    resizeMode: options.resize.mode,
  });
  const blob = useOriginal ? file : encoded;
  const objectUrl = URL.createObjectURL(blob);

  await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outputName)]);
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
    mimeType: MIME_BY_FORMAT[options.outputFormat],
    width: dimensions.width,
    height: dimensions.height,
    duration: metadata.duration,
    savedBytes: file.size - blob.size,
    warnings: useOriginal ? [NO_GAIN_WARNING] : undefined,
  };
}

async function getFfmpeg(onProgress: (progress: number) => void) {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = loadFfmpeg(onProgress);
  }

  ffmpegInstance = await ffmpegLoadPromise;

  return ffmpegInstance;
}

async function loadFfmpeg(onProgress: (progress: number) => void) {
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ffmpeg = new FFmpeg();
  const baseUrl = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

  ffmpeg.on("progress", ({ progress }) => {
    onProgress(Math.min(98, Math.max(20, Math.round(progress * 98))));
  });
  ffmpeg.on("log", ({ message }) => {
    if (message.trim()) {
      lastFfmpegLog = message.trim();
    }
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}
