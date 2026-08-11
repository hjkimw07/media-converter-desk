import type { ImageOutputFormat } from "@/types/media";

export type { WorkerMessage } from "@/types/media";

export type EncodeTarget = {
  targetBytes: number;
  minQuality: number;
};

export type EncodeRequest = {
  id: string;
  imageData: ImageData;
  format: ImageOutputFormat;
  /** 목표 용량 모드에서는 탐색의 상한 품질로 쓰입니다. */
  quality: number;
  /** 없으면 quality 그대로 1회만 인코딩합니다. */
  target?: EncodeTarget;
};

export type EncodeResponse =
  | { type: "encode:done"; id: string; blob: Blob; reachedTarget: boolean }
  | { type: "encode:error"; id: string; message: string };
