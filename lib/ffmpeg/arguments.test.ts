import { describe, expect, it } from "vitest";
import { buildVideoConvertArgs, resolveCodecForFormat, resolveTargetVideoBitrateKbps } from "./arguments";
import type { VideoAudioOptions } from "@/types/media";

const KEEP_AUDIO: VideoAudioOptions = { mode: "keep", bitrateKbps: 128 };

describe("buildVideoConvertArgs", () => {
  it("builds MP4 arguments with H.264, scale, and bitrate", () => {
    expect(
      buildVideoConvertArgs({
        inputName: "input.mov",
        outputName: "output.mp4",
        outputFormat: "mp4",
        videoCodec: "h264",
        bitrateKbps: 1200,
        audio: KEEP_AUDIO,
        resize: {
          mode: "dimensions",
          width: 1280,
          height: 720,
          maintainAspectRatio: true,
        },
      }),
    ).toEqual([
      "-i",
      "input.mov",
      "-vf",
      "scale=1280:720",
      "-c:v",
      "libx264",
      "-b:v",
      "1200k",
      "-c:a",
      "copy",
      "-preset",
      "veryfast",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
  });

  it("CRF만 지정하면 CRF 인자를 사용해야 한다", () => {
    expect(
      buildVideoConvertArgs({
        inputName: "input.webm",
        outputName: "output.mp4",
        outputFormat: "mp4",
        videoCodec: "h264",
        crf: 26,
        audio: { mode: "compress", bitrateKbps: 96 },
        resize: {
          mode: "original",
          maintainAspectRatio: true,
        },
      }),
    ).toEqual([
      "-i",
      "input.webm",
      "-c:v",
      "libx264",
      "-crf",
      "26",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-preset",
      "veryfast",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
  });

  it("오디오 제거 모드면 -an을 넣고 오디오 코덱 인자를 넣지 않아야 한다", () => {
    const args = buildVideoConvertArgs({
      inputName: "input.mp4",
      outputName: "output.mp4",
      outputFormat: "mp4",
      videoCodec: "h264",
      crf: 24,
      audio: { mode: "remove" },
      resize: { mode: "original", maintainAspectRatio: true },
    });

    expect(args).toContain("-an");
    expect(args).not.toContain("-c:a");
    expect(args).not.toContain("-b:a");
  });

  it("오디오 유지 모드면 스트림을 그대로 복사해야 한다", () => {
    const args = buildVideoConvertArgs({
      inputName: "input.mov",
      outputName: "output.mp4",
      outputFormat: "mp4",
      videoCodec: "h264",
      crf: 24,
      audio: KEEP_AUDIO,
      resize: { mode: "original", maintainAspectRatio: true },
    });

    expect(args.join(" ")).toContain("-c:a copy");
    expect(args).not.toContain("-b:a");
  });

  it("목표 용량을 주면 CRF 대신 역산한 비디오 비트레이트를 사용해야 한다", () => {
    const args = buildVideoConvertArgs({
      inputName: "input.mp4",
      outputName: "output.mp4",
      outputFormat: "mp4",
      videoCodec: "h264",
      crf: 24,
      bitrateKbps: 5000,
      targetSizeKb: 10240,
      durationSeconds: 60,
      audio: { mode: "compress", bitrateKbps: 128 },
      resize: { mode: "original", maintainAspectRatio: true },
    });

    expect(args).not.toContain("-crf");
    // 10240KB * 1024 * 8 / 60 / 1000 = 1398.1 kbps, 오디오 128 제외 → 1270
    expect(args.join(" ")).toContain("-b:v 1270k");
  });

  it("길이를 모르면 목표 용량을 무시하고 기존 CRF 경로를 유지해야 한다", () => {
    const args = buildVideoConvertArgs({
      inputName: "input.mp4",
      outputName: "output.mp4",
      outputFormat: "mp4",
      videoCodec: "h264",
      crf: 32,
      targetSizeKb: 1024,
      audio: { mode: "remove" },
      resize: { mode: "original", maintainAspectRatio: true },
    });

    expect(args.join(" ")).toContain("-crf 32");
  });
});

describe("resolveTargetVideoBitrateKbps", () => {
  it("목표 용량과 길이로 오디오를 뺀 비디오 비트레이트를 계산해야 한다", () => {
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: 10240, durationSeconds: 60, audioBitrateKbps: 128 })).toBe(1270);
  });

  it("길이가 0이거나 없으면 undefined를 반환해야 한다", () => {
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: 1024, durationSeconds: 0, audioBitrateKbps: 128 })).toBeUndefined();
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: 1024, audioBitrateKbps: 128 })).toBeUndefined();
    expect(
      resolveTargetVideoBitrateKbps({ targetSizeKb: 1024, durationSeconds: Number.NaN, audioBitrateKbps: 128 }),
    ).toBeUndefined();
  });

  it("오디오만으로 목표를 넘기면 undefined를 반환해야 한다", () => {
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: 10, durationSeconds: 60, audioBitrateKbps: 128 })).toBeUndefined();
  });

  it("목표 용량이 없거나 0 이하면 undefined를 반환해야 한다", () => {
    expect(resolveTargetVideoBitrateKbps({ durationSeconds: 60, audioBitrateKbps: 128 })).toBeUndefined();
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: 0, durationSeconds: 60, audioBitrateKbps: 128 })).toBeUndefined();
    expect(resolveTargetVideoBitrateKbps({ targetSizeKb: -5, durationSeconds: 60, audioBitrateKbps: 128 })).toBeUndefined();
  });
});

describe("resolveCodecForFormat", () => {
  it("컨테이너가 담을 수 있는 코덱이면 그대로 유지해야 한다", () => {
    expect(resolveCodecForFormat("mp4", "h264")).toBe("h264");
  });

  it("담을 수 없는 코덱이 들어오면 기본 코덱으로 되돌려야 한다", () => {
    expect(resolveCodecForFormat("mp4", "vp9" as never)).toBe("h264");
    expect(resolveCodecForFormat("mp4", "h265" as never)).toBe("h264");
  });
});

