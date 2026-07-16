export const maxObservationImageBytes = 5 * 1024 * 1024;

export function decodeObservationImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);

  if (!match) {
    throw new Error("A live camera image is required.");
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length === 0) {
    throw new Error("A live camera image is required.");
  }

  if (buffer.length > maxObservationImageBytes) {
    throw new Error("Live camera images must be 5MB or smaller.");
  }

  return {
    buffer,
    extension,
  };
}
