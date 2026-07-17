import { handleApiV1Request } from "@/lib/api-v1";
import { getApiCurrentUser } from "@/lib/api-v1-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiV1Request(request, getApiCurrentUser);
}
