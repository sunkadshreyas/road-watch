export type CaptureQueueStatus = "queued" | "uploading" | "failed" | "confirmed";

export type QueuedCapture = {
  idempotencyKey: string;
  imageUri: string;
  roadId: string;
  issueType: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  attempts: number;
  status: CaptureQueueStatus;
  lastError: string | null;
  observationId: string | null;
};

export type NewCaptureInput = Pick<
  QueuedCapture,
  "imageUri" | "roadId" | "issueType" | "latitude" | "longitude"
>;

export type NewCaptureOptions = {
  idempotencyKey?: string;
  now?: string;
};

export function createIdempotencyKey(
  now = Date.now(),
  random = Math.random(),
): string {
  const randomPart = Math.floor(random * Number.MAX_SAFE_INTEGER).toString(36);
  return `capture-${now.toString(36)}-${randomPart}`;
}

export function newQueuedCapture(
  input: NewCaptureInput,
  options: NewCaptureOptions = {},
): QueuedCapture {
  return {
    ...input,
    idempotencyKey: options.idempotencyKey ?? createIdempotencyKey(),
    capturedAt: options.now ?? new Date().toISOString(),
    attempts: 0,
    status: "queued",
    lastError: null,
    observationId: null,
  };
}

export function enqueueCapture(
  queue: readonly QueuedCapture[],
  capture: QueuedCapture,
): QueuedCapture[] {
  if (queue.some((item) => item.idempotencyKey === capture.idempotencyKey)) {
    return [...queue];
  }

  return [...queue, capture];
}

export function markCaptureUploading(
  queue: readonly QueuedCapture[],
  idempotencyKey: string,
): QueuedCapture[] {
  return queue.map((capture) =>
    capture.idempotencyKey === idempotencyKey
      ? { ...capture, status: "uploading", lastError: null }
      : capture,
  );
}

export function markCaptureFailed(
  queue: readonly QueuedCapture[],
  idempotencyKey: string,
  error: string,
): QueuedCapture[] {
  return queue.map((capture) =>
    capture.idempotencyKey === idempotencyKey
      ? {
          ...capture,
          status: "failed",
          attempts: capture.attempts + 1,
          lastError: error,
        }
      : capture,
  );
}

export function markCaptureConfirmed(
  queue: readonly QueuedCapture[],
  idempotencyKey: string,
  observationId: string,
): QueuedCapture[] {
  return queue.map((capture) =>
    capture.idempotencyKey === idempotencyKey
      ? {
          ...capture,
          status: "confirmed",
          lastError: null,
          observationId,
        }
      : capture,
  );
}

export function nextUploadCandidate(
  queue: readonly QueuedCapture[],
): QueuedCapture | null {
  return (
    queue.find(
      (capture) =>
        capture.roadId.trim().length > 0 &&
        (capture.status === "queued" || capture.status === "failed"),
    ) ?? null
  );
}

function isQueuedCapture(value: unknown): value is QueuedCapture {
  if (!value || typeof value !== "object") {
    return false;
  }

  const capture = value as Record<string, unknown>;

  return (
    typeof capture.idempotencyKey === "string" &&
    typeof capture.imageUri === "string" &&
    typeof capture.roadId === "string" &&
    typeof capture.issueType === "string" &&
    typeof capture.latitude === "number" &&
    Number.isFinite(capture.latitude) &&
    typeof capture.longitude === "number" &&
    Number.isFinite(capture.longitude) &&
    typeof capture.capturedAt === "string" &&
    typeof capture.attempts === "number" &&
    Number.isInteger(capture.attempts) &&
    capture.attempts >= 0 &&
    ["queued", "uploading", "failed", "confirmed"].includes(
      String(capture.status),
    ) &&
    (capture.lastError === null || typeof capture.lastError === "string") &&
    (capture.observationId === null || typeof capture.observationId === "string")
  );
}

export function parseCaptureQueue(serialized: string): QueuedCapture[] {
  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value) ? value.filter(isQueuedCapture) : [];
  } catch {
    return [];
  }
}
