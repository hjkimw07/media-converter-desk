export type MediaType = "image" | "video";

export type ProcessStatus = "idle" | "pending" | "processing" | "completed" | "failed" | "cancelled";

export type ImageOutputFormat = "jpg" | "png" | "webp" | "avif";

/**
 * WEBM은 제외되어 있습니다. libvpx(VP8/VP9) 인코더가 배포된 모든 @ffmpeg/core wasm
 * 빌드에서 초기화 직후 "memory access out of bounds"로 죽어 사용할 수 없습니다.
 */
export type VideoOutputFormat = "mp4";

/**
 * H.265는 제외되어 있습니다. libx265가 wasm에서 실용 불가능하게 느립니다
 * (2초 320x240 클립이 5분 넘게 18% 진행).
 */
export type VideoCodec = "h264";

export type ResizeMode = "original" | "percent" | "dimensions" | "preset";

export type ResizeOptions = {
  mode: ResizeMode;
  width?: number;
  height?: number;
  percent?: 25 | 50 | 75 | 100 | 150 | 200;
  preset?: "thumbnail" | "blog" | "social" | "banner" | "1080p" | "720p" | "480p";
  maintainAspectRatio: boolean;
};

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  hasAlpha?: boolean;
};

export type VideoMetadata = {
  width: number;
  height: number;
  duration: number;
  fps?: number;
  hasAudio?: boolean;
  codec?: string;
};

export type ApiError = {
  code: string;
  message: string;
  detail?: string;
};

export type MediaWarning = {
  code: string;
  message: string;
};

export type ProcessResult = {
  blob: Blob;
  objectUrl: string;
  outputName: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  /** 원본 대비 절감 바이트. 음수면 결과가 더 커졌다는 뜻입니다. */
  savedBytes: number;
  /** 목표 용량 미달, 원본 유지 폴백 등 변환 중 발생한 알림. */
  warnings?: MediaWarning[];
};

export type CompressionMode = "quality" | "targetSize";

export type ImageCompressionOptions = {
  mode: CompressionMode;
  /** targetSize 모드의 목표 용량(KB). */
  targetSizeKb?: number;
  /** targetSize 모드에서 품질이 이 값 아래로는 내려가지 않습니다. */
  minQuality: number;
};

export type ImageProcessOptions = {
  outputFormat: ImageOutputFormat;
  quality: number;
  compression: ImageCompressionOptions;
  resize: ResizeOptions;
  backgroundColor: string;
  stripMetadata: boolean;
};

/** keep: 원본 스트림 복사 / compress: 지정 비트레이트로 재인코딩 / remove: 오디오 제거 */
export type AudioMode = "keep" | "compress" | "remove";

export type VideoAudioOptions = {
  mode: AudioMode;
  bitrateKbps?: number;
};

export type VideoProcessOptions = {
  outputFormat: VideoOutputFormat;
  videoCodec: VideoCodec;
  bitrateKbps?: number;
  crf?: number;
  audio: VideoAudioOptions;
  /** 지정하면 CRF 대신 목표 용량에서 역산한 비트레이트를 사용합니다. */
  targetSizeKb?: number;
  resize: ResizeOptions;
};

export type UploadedMedia = {
  id: string;
  file: File;
  type: MediaType;
  name: string;
  size: number;
  mimeType: string;
  objectUrl: string;
  metadata?: ImageMetadata | VideoMetadata;
  status: ProcessStatus;
  progress: number;
  result?: ProcessResult;
  error?: ApiError;
  warnings: MediaWarning[];
};

export type ValidationResult =
  | { ok: true; mediaType: MediaType; warnings: MediaWarning[] }
  | { ok: false; error: ApiError };

export type BrowserVideoDecision =
  | { mode: "browser"; reason: string }
  | { mode: "server_recommended"; reason: string };

export type WorkerMessage =
  | { type: "process:start"; id: string }
  | { type: "process:progress"; id: string; progress: number }
  | { type: "process:complete"; id: string; result: ProcessResult }
  | { type: "process:error"; id: string; error: ApiError }
  | { type: "process:cancel"; id: string };

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type ServerProcessingResponse =
  | { mode: "not_implemented"; feature: string; message: string }
  | { mode: "job"; jobId: string };
