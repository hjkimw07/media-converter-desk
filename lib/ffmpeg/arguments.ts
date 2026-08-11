import type { VideoCodec, VideoOutputFormat, VideoProcessOptions } from "@/types/media";

type BuildVideoConvertArgsInput = VideoProcessOptions & {
  inputName: string;
  outputName: string;
  /** 목표 용량에서 비트레이트를 역산할 때 필요합니다. */
  durationSeconds?: number;
};

const VIDEO_CODEC_ARGS: Record<VideoCodec, string> = {
  h264: "libx264",
};

/** 컨테이너별로 실제 담을 수 있는 코덱. 각 목록의 첫 항목이 기본값입니다. */
const CODECS_BY_FORMAT: Record<VideoOutputFormat, readonly VideoCodec[]> = {
  mp4: ["h264"],
};

/** 컨테이너가 담을 수 없는 코덱이 선택돼 있으면 해당 컨테이너의 기본 코덱으로 되돌립니다. */
export function resolveCodecForFormat(outputFormat: VideoOutputFormat, videoCodec: VideoCodec): VideoCodec {
  const allowed = CODECS_BY_FORMAT[outputFormat];

  return allowed.includes(videoCodec) ? videoCodec : allowed[0];
}

export function getCodecsForFormat(outputFormat: VideoOutputFormat): readonly VideoCodec[] {
  return CODECS_BY_FORMAT[outputFormat];
}

const AUDIO_CODEC_BY_FORMAT: Record<VideoOutputFormat, string> = {
  mp4: "aac",
};

/** 오디오 비트레이트를 지정하지 않았을 때 쓰는 값이자, copy 모드에서 목표 용량 역산에 쓰는 추정치. */
const DEFAULT_AUDIO_BITRATE_KBPS = 128;

const BITS_PER_KILOBIT = 1000;
const BITS_PER_BYTE = 8;
const BYTES_PER_KB = 1024;

/**
 * 목표 용량을 채우는 비디오 비트레이트(kbps)를 계산합니다.
 *
 * 계산 불가(길이를 모르거나 0 이하)이거나 오디오만으로 목표를 넘기면 `undefined`를
 * 반환해 호출부가 기존 CRF 경로를 그대로 쓰게 합니다.
 */
export function resolveTargetVideoBitrateKbps({
  targetSizeKb,
  durationSeconds,
  audioBitrateKbps,
}: {
  targetSizeKb?: number;
  durationSeconds?: number;
  audioBitrateKbps: number;
}): number | undefined {
  if (targetSizeKb === undefined || targetSizeKb <= 0) {
    return undefined;
  }

  if (durationSeconds === undefined || durationSeconds <= 0 || !Number.isFinite(durationSeconds)) {
    return undefined;
  }

  const totalKbps = (targetSizeKb * BYTES_PER_KB * BITS_PER_BYTE) / durationSeconds / BITS_PER_KILOBIT;
  const videoKbps = Math.floor(totalKbps - audioBitrateKbps);

  return videoKbps > 0 ? videoKbps : undefined;
}

export function buildVideoConvertArgs({
  inputName,
  outputName,
  outputFormat,
  videoCodec,
  bitrateKbps,
  crf,
  audio,
  targetSizeKb,
  durationSeconds,
  resize,
}: BuildVideoConvertArgsInput) {
  const args = ["-i", inputName];

  if (resize.mode !== "original" && resize.width && resize.height) {
    args.push("-vf", `scale=${resize.width}:${resize.height}`);
  }

  args.push("-c:v", VIDEO_CODEC_ARGS[videoCodec]);

  const audioBitrateKbps = audio.bitrateKbps ?? DEFAULT_AUDIO_BITRATE_KBPS;
  const reservedAudioKbps = audio.mode === "remove" ? 0 : audioBitrateKbps;

  const targetBitrateKbps = resolveTargetVideoBitrateKbps({
    targetSizeKb,
    durationSeconds,
    audioBitrateKbps: reservedAudioKbps,
  });

  if (targetBitrateKbps !== undefined) {
    // ponytail: 단일 패스 비트레이트 추정이라 실제 결과가 목표를 다소 넘거나 밑돌 수 있습니다.
    // 정확도가 필요해지면 2-pass(-pass 1/2)로 승격하세요.
    args.push("-b:v", `${targetBitrateKbps}k`);
  } else {
    if (crf !== undefined) {
      args.push("-crf", String(crf));
    }

    if (bitrateKbps !== undefined) {
      args.push("-b:v", `${bitrateKbps}k`);
    }
  }

  if (audio.mode === "remove") {
    args.push("-an");
  } else if (audio.mode === "keep") {
    args.push("-c:a", "copy");
  } else {
    args.push("-c:a", AUDIO_CODEC_BY_FORMAT[outputFormat], "-b:a", `${audioBitrateKbps}k`);
  }

  args.push("-preset", "veryfast", "-movflags", "+faststart");

  args.push(outputName);

  return args;
}
