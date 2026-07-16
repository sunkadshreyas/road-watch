export type StoppableMediaStream = {
  getTracks: () => Array<{ stop: () => void }>;
};

export function stopMediaStream(stream: StoppableMediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function replaceMediaStream<T extends StoppableMediaStream>(
  current: T | null,
  next: T | null,
) {
  if (current && current !== next) {
    stopMediaStream(current);
  }

  return next;
}
