import {
  markCaptureConfirmed,
  markCaptureFailed,
  markCaptureUploading,
  nextUploadCandidate,
  type QueuedCapture,
} from "./offline-queue";

export type CaptureQueueRepository = {
  load: () => Promise<QueuedCapture[]>;
  save: (queue: readonly QueuedCapture[]) => Promise<void>;
};

export type CaptureUploadResult = {
  observationId: string;
};

export type CaptureUploader = (
  capture: QueuedCapture,
  idempotencyKey: string,
) => Promise<CaptureUploadResult>;

export type QueueSyncResult =
  | { status: "idle"; capture: null }
  | { status: "confirmed"; capture: QueuedCapture }
  | { status: "failed"; capture: QueuedCapture; error: string };

type SyncNextCaptureInput = {
  repository: CaptureQueueRepository;
  upload: CaptureUploader;
};

function recoverInterruptedUploads(
  queue: readonly QueuedCapture[],
): QueuedCapture[] {
  return queue.map((capture) =>
    capture.status === "uploading"
      ? {
          ...capture,
          status: "failed",
          lastError: "Previous upload was interrupted and will retry.",
        }
      : capture,
  );
}

export async function syncNextCapture({
  repository,
  upload,
}: SyncNextCaptureInput): Promise<QueueSyncResult> {
  const recoveredQueue = recoverInterruptedUploads(await repository.load());
  const candidate = nextUploadCandidate(recoveredQueue);

  if (!candidate) {
    return { status: "idle", capture: null };
  }

  const uploadingQueue = markCaptureUploading(
    recoveredQueue,
    candidate.idempotencyKey,
  );
  await repository.save(uploadingQueue);

  try {
    const result = await upload(candidate, candidate.idempotencyKey);
    const confirmedQueue = markCaptureConfirmed(
      uploadingQueue,
      candidate.idempotencyKey,
      result.observationId,
    );
    await repository.save(confirmedQueue);

    return {
      status: "confirmed",
      capture: confirmedQueue.find(
        (capture) => capture.idempotencyKey === candidate.idempotencyKey,
      )!,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const failedQueue = markCaptureFailed(
      uploadingQueue,
      candidate.idempotencyKey,
      message,
    );
    await repository.save(failedQueue);

    return {
      status: "failed",
      capture: failedQueue.find(
        (capture) => capture.idempotencyKey === candidate.idempotencyKey,
      )!,
      error: message,
    };
  }
}
