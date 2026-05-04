import { getRoadExportRows, rowsToCsv } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rows = await getRoadExportRows(slug);
  const csv = rowsToCsv(rows);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-road-record.csv"`,
    },
  });
}
