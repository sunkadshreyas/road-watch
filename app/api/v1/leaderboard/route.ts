import { handleApiV1Request } from "@/lib/api-v1";
import { getApiLeaderboard, parseApiLeaderboardWindow } from "@/lib/api-v1-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiV1Request(request, async (user) => {
    const window = parseApiLeaderboardWindow(new URL(request.url).searchParams);
    return getApiLeaderboard(user, window);
  });
}
