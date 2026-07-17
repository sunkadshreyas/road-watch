export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    {
      error: {
        code: "AUTH_PROVIDER_NOT_CONFIGURED",
        message:
          "Native sign-in is unavailable until the approved OIDC provider is configured.",
      },
    },
    {
      status: 501,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
