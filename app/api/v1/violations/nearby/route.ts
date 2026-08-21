import { handleApiV1Request } from "@/lib/api-v1";
import { getNearbyApiViolations, parseNearbyQuery } from "@/lib/api-v1-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiV1Request(request, async (user) => {
    const query = parseNearbyQuery(new URL(request.url).searchParams);
    return getNearbyApiViolations(user, query);
  });
}
