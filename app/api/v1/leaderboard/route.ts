import { handleApiV1Request } from "@/lib/api-v1";
import {
  getApiLeaderboard,
  parseApiLeaderboardFilters,
} from "@/lib/api-v1-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiV1Request(request, async (user) => {
    const filters = parseApiLeaderboardFilters(new URL(request.url).searchParams);
    return getApiLeaderboard(user, filters.window, filters.roadSlug ?? null);
  });
}
