import { getRoadExportRows } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rows = await getRoadExportRows(slug);

  return Response.json(rows);
}
