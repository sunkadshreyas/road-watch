export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: FetchLike;
};

export type MutationOptions = {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "REQUEST_FAILED",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (!/^https?:\/\//.test(normalized)) {
    throw new Error("RoadWatch API URL must be an absolute HTTP or HTTPS URL.");
  }

  return normalized;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      throw new ApiError(
        "RoadWatch could not reach the API.",
        0,
        "NETWORK_ERROR",
      );
    }
    const body = await readResponseBody(response);

    if (!response.ok) {
      const bodyObject =
        body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      const payload =
        bodyObject.error && typeof bodyObject.error === "object"
          ? (bodyObject.error as ApiErrorPayload)
          : (bodyObject as ApiErrorPayload);
      throw new ApiError(
        payload.message ?? `Request failed with HTTP ${response.status}.`,
        response.status,
        payload.code,
      );
    }

    if (body && typeof body === "object" && "data" in body) {
      return (body as { data: T }).data;
    }

    return body as T;
  }

  return {
    get<T>(path: string, signal?: AbortSignal) {
      return request<T>(path, { method: "GET", signal });
    },
    post<T>(path: string, body: unknown, mutation: MutationOptions = {}) {
      const headers = new Headers({ "content-type": "application/json" });
      if (mutation.idempotencyKey) {
        headers.set("idempotency-key", mutation.idempotencyKey);
      }

      return request<T>(path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: mutation.signal,
      });
    },
  };
}
