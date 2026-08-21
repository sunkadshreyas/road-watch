import { timingSafeEqual } from "node:crypto";

import type { User, Ward } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AuthenticatedApiUser = User & {
  ward: Ward;
};

type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

class ApiV1Error extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiV1Error";
  }
}

const apiHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json; charset=utf-8",
  Vary: "Authorization",
};

const rateWindowMs = 60_000;
const rateLimitPerWindow = 120;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

function errorResponse(error: ApiV1Error) {
  const headers = new Headers(apiHeaders);

  if (error.status === 401) {
    headers.set("WWW-Authenticate", 'Bearer realm="roadwatch-api"');
  }

  if (error.status === 429) {
    headers.set("Retry-After", "60");
  }

  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    {
      status: error.status,
      headers,
    },
  );
}

function successResponse<T>(data: T) {
  return Response.json(
    { data },
    {
      status: 200,
      headers: apiHeaders,
    },
  );
}

function unauthorized() {
  return new ApiV1Error(
    401,
    "UNAUTHORIZED",
    "Bearer authentication is required.",
  );
}

function rateLimited() {
  return new ApiV1Error(
    429,
    "RATE_LIMITED",
    "Too many API requests. Try again shortly.",
  );
}

export function invalidApiQuery() {
  return new ApiV1Error(
    400,
    "INVALID_REQUEST",
    "Query parameters are invalid.",
  );
}

export function forbiddenApiRequest(message: string) {
  return new ApiV1Error(403, "FORBIDDEN", message);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw unauthorized();
  }

  const token = authorization.slice("Bearer ".length);

  if (!token || token.trim() !== token || /\s/.test(token)) {
    throw unauthorized();
  }

  return token;
}

function tokenBindings() {
  const rawBindings = process.env.ROADWATCH_API_TOKENS_JSON;

  if (!rawBindings?.trim()) {
    return [] as Array<[token: string, userId: string]>;
  }

  try {
    const parsed = JSON.parse(rawBindings) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Token bindings must be an object.");
    }

    const bindings = Object.entries(parsed).map(([token, userId]) => {
      if (
        token.length < 16 ||
        typeof userId !== "string" ||
        userId.trim().length === 0
      ) {
        throw new Error("Token bindings are invalid.");
      }

      return [token, userId] as [string, string];
    });

    return bindings;
  } catch {
    throw new ApiV1Error(
      500,
      "INTERNAL_ERROR",
      "The API is not configured correctly.",
    );
  }
}

function tokenMatches(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

async function authenticateApiRequest(request: Request) {
  const token = bearerToken(request);
  const userId = tokenBindings().find(([candidate]) => tokenMatches(candidate, token))?.[1];

  if (!userId) {
    throw unauthorized();
  }

  const now = Date.now();
  const clientKey = `${userId}:${request.headers.get("x-forwarded-for") ?? "direct"}`;
  const bucket = requestBuckets.get(clientKey);

  if (!bucket || now - bucket.startedAt >= rateWindowMs) {
    requestBuckets.set(clientKey, { startedAt: now, count: 1 });
  } else if (bucket.count >= rateLimitPerWindow) {
    throw rateLimited();
  } else {
    bucket.count += 1;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ward: true },
  });

  if (!user) {
    throw unauthorized();
  }

  return user;
}

export async function handleApiV1Request<T>(
  request: Request,
  handler: (user: AuthenticatedApiUser) => Promise<T> | T,
) {
  try {
    const user = await authenticateApiRequest(request);
    return successResponse(await handler(user));
  } catch (error) {
    if (error instanceof ApiV1Error) {
      return errorResponse(error);
    }

    return errorResponse(
      new ApiV1Error(
        500,
        "INTERNAL_ERROR",
        "The request could not be completed.",
      ),
    );
  }
}
