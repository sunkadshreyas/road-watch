import { handleApiV1Request } from "@/lib/api-v1";
import { getApiCollection } from "@/lib/api-v1-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiV1Request(request, getApiCollection);
}
