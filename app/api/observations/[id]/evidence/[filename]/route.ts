import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function notFoundResponse() {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string; filename: string }>;
  },
) {
  const { id, filename } = await context.params;

  if (basename(filename) !== filename) {
    return notFoundResponse();
  }

  const observation = await prisma.observation.findUnique({
    where: {
      id,
    },
    include: {
      receipts: true,
    },
  });
  const expectedEvidencePath = `/api/observations/${id}/evidence/${filename}`;

  if (!observation || observation.evidencePath !== expectedEvidencePath) {
    return notFoundResponse();
  }

  const user = await getSessionUser();
  const canView =
    observation.humanCheckStatus === "CLEARED" ||
    user?.role === "GOV" ||
    observation.receipts.some((receipt) => receipt.userId === user?.id);

  if (!canView) {
    return notFoundResponse();
  }

  try {
    const image = await readFile(join(process.cwd(), "storage", "observations", filename));
    const contentType = contentTypes[extname(filename).toLowerCase()];

    if (!contentType) {
      return notFoundResponse();
    }

    return new Response(image, {
      headers: {
        "Cache-Control":
          observation.humanCheckStatus === "CLEARED"
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFoundResponse();
  }
}
