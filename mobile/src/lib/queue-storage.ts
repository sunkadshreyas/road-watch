import { Directory, File, Paths } from "expo-file-system";

import {
  enqueueCapture,
  parseCaptureQueue,
  type QueuedCapture,
} from "@/lib/offline-queue";

const queueDirectory = new Directory(Paths.document, "roadwatch-capture-queue");
const queueFile = new File(queueDirectory, "queue.json");

function ensureQueueDirectory() {
  queueDirectory.create({ idempotent: true, intermediates: true });
}

export async function loadCaptureQueue(): Promise<QueuedCapture[]> {
  ensureQueueDirectory();
  return queueFile.exists ? parseCaptureQueue(await queueFile.text()) : [];
}

export async function saveCaptureQueue(queue: readonly QueuedCapture[]) {
  ensureQueueDirectory();
  if (!queueFile.exists) {
    queueFile.create({ intermediates: true });
  }
  queueFile.write(JSON.stringify(queue));
}

export async function persistEvidencePhoto(sourceUri: string, idempotencyKey: string) {
  ensureQueueDirectory();
  const source = new File(sourceUri);
  const destination = new File(queueDirectory, `${idempotencyKey}.jpg`);

  if (!destination.exists) {
    source.copy(destination);
  }

  return destination.uri;
}

export async function appendCapture(capture: QueuedCapture) {
  const queue = await loadCaptureQueue();
  const nextQueue = enqueueCapture(queue, capture);
  await saveCaptureQueue(nextQueue);
  return nextQueue;
}

export const captureQueueRepository = {
  load: loadCaptureQueue,
  save: saveCaptureQueue,
};
