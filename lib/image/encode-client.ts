import { encodeImage, isLossyFormat } from "@/lib/image/encoders";
import { searchQualityForTargetSize } from "@/lib/image/target-size";
import type { EncodeRequest, EncodeResponse } from "@/workers/messages";

export type EncodeJob = Omit<EncodeRequest, "id">;

export type EncodeOutcome = {
  blob: Blob;
  reachedTarget: boolean;
};

type PendingJob = {
  resolve: (outcome: EncodeOutcome) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let workerUnavailable = false;
let nextJobId = 0;
const pending = new Map<string, PendingJob>();

/**
 * 이미지 인코딩을 Worker에서 실행합니다.
 *
 * Worker를 만들 수 없거나 실행 중 죽으면 같은 로직을 메인 스레드에서 그대로 수행합니다.
 * 인코딩 결과는 어느 경로로 가든 동일하고, 차이는 UI가 멈추는지 여부뿐입니다.
 */
export async function encodeInWorker(job: EncodeJob): Promise<EncodeOutcome> {
  const activeWorker = getWorker();

  if (!activeWorker) {
    return encodeOnMainThread(job);
  }

  const id = String(nextJobId++);

  try {
    return await new Promise<EncodeOutcome>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      activeWorker.postMessage({ ...job, id } satisfies EncodeRequest);
    });
  } catch {
    // Worker 경로가 실패하면 이후 작업까지 막지 않도록 폐기하고 메인 스레드로 처리합니다.
    disposeWorker();
    return encodeOnMainThread(job);
  }
}

function getWorker(): Worker | null {
  if (workerUnavailable) {
    return null;
  }

  if (worker) {
    return worker;
  }

  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    workerUnavailable = true;
    return null;
  }

  try {
    worker = new Worker(new URL("../../workers/image.worker.ts", import.meta.url));
    worker.addEventListener("message", (event: MessageEvent<EncodeResponse>) => {
      const message = event.data;
      const job = pending.get(message.id);

      if (!job) {
        return;
      }

      pending.delete(message.id);

      if (message.type === "encode:done") {
        job.resolve({ blob: message.blob, reachedTarget: message.reachedTarget });
        return;
      }

      job.reject(new Error(message.message));
    });
    worker.addEventListener("error", () => {
      rejectAllPending(new Error("Image encoding worker crashed."));
      disposeWorker();
    });

    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

function disposeWorker() {
  worker?.terminate();
  worker = null;
  workerUnavailable = true;
}

function rejectAllPending(error: Error) {
  for (const job of pending.values()) {
    job.reject(error);
  }

  pending.clear();
}

/** Worker를 못 쓸 때 쓰는 동일 로직의 메인 스레드 경로. */
export async function encodeOnMainThread({ imageData, format, quality, target }: EncodeJob): Promise<EncodeOutcome> {
  const encode = (value: number) => encodeImage({ imageData, format, quality: value });

  if (!target || !isLossyFormat(format)) {
    return { blob: await encode(quality), reachedTarget: true };
  }

  const search = await searchQualityForTargetSize({
    encode,
    targetBytes: target.targetBytes,
    minQuality: target.minQuality,
    maxQuality: quality,
  });

  return { blob: search.blob, reachedTarget: search.reachedTarget };
}
