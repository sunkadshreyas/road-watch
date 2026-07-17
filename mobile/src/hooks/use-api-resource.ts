import { useCallback, useEffect, useState } from "react";

import { getApiClient } from "@/lib/api";

type ResourceState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

export function useApiResource<T>(path: string | null) {
  const configurationError = process.env.EXPO_PUBLIC_API_URL
    ? null
    : "Set EXPO_PUBLIC_API_URL before connecting RoadWatch mobile.";
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<ResourceState<T>>(() =>
    configurationError
      ? { status: "error", data: null, error: configurationError }
      : { status: "loading", data: null, error: null },
  );

  useEffect(() => {
    const controller = new AbortController();

    if (configurationError || !path) {
      return () => controller.abort();
    }

    const client = getApiClient();
    client
      .get<T>(path, controller.signal)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "RoadWatch could not load this view.",
        });
      });

    return () => controller.abort();
  }, [configurationError, path, reloadToken]);

  const reload = useCallback(() => {
    if (configurationError) {
      setState({ status: "error", data: null, error: configurationError });
      return;
    }

    setState({ status: "loading", data: null, error: null });
    setReloadToken((value) => value + 1);
  }, [configurationError]);

  return { ...state, reload };
}
