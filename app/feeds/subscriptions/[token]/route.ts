import { getSubscriptionFeed } from "@/lib/data";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const feed = await getSubscriptionFeed(token);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <description>${escapeXml(feed.description)}</description>
    <link>${escapeXml(feed.siteUrl)}</link>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(feed.feedUrl)}" rel="self" type="application/rss+xml" />
    ${feed.items
      .map(
        (item) => `
    <item>
      <guid>${escapeXml(item.guid)}</guid>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <link>${escapeXml(item.link)}</link>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
