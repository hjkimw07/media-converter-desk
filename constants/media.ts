import type { ImageProcessOptions, VideoProcessOptions } from "@/types/media";

export const SUPPORTED_IMAGE_INPUTS = ["jpg", "jpeg", "png", "webp", "avif", "gif"] as const;
export const SUPPORTED_VIDEO_INPUTS = ["mp4", "mov", "webm", "mkv", "avi", "m4v"] as const;

export const IMAGE_OUTPUT_FORMATS = ["jpg", "png", "webp", "avif"] as const;
export const VIDEO_OUTPUT_FORMATS = ["mp4"] as const;

export const DESKTOP_VIDEO_LIMIT_BYTES = 100 * 1024 * 1024;
export const MOBILE_VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;
export const DESKTOP_VIDEO_LIMIT_SECONDS = 120;
export const MOBILE_VIDEO_LIMIT_SECONDS = 60;

/** 목표 용량 탐색이 화질을 무한정 떨어뜨리지 않도록 막는 기본 하한선. */
export const DEFAULT_MIN_QUALITY = 40;

export const DEFAULT_IMAGE_OPTIONS: ImageProcessOptions = {
  outputFormat: "webp",
  quality: 80,
  compression: {
    mode: "quality",
    minQuality: DEFAULT_MIN_QUALITY,
  },
  resize: {
    mode: "original",
    maintainAspectRatio: true,
  },
  backgroundColor: "#ffffff",
  stripMetadata: true,
};

export const DEFAULT_AUDIO_BITRATE_KBPS = 128;

export const DEFAULT_VIDEO_OPTIONS: VideoProcessOptions = {
  outputFormat: "mp4",
  videoCodec: "h264",
  bitrateKbps: 1600,
  crf: 26,
  audio: {
    mode: "keep",
    bitrateKbps: DEFAULT_AUDIO_BITRATE_KBPS,
  },
  resize: {
    mode: "original",
    maintainAspectRatio: true,
  },
};

export const ACCEPTED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mp4",
].join(",");
