import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ObservationSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createFixtureAdapters, type NormalizedSourceEvent } from "@/lib/source-adapters";
import { ingestSourceEvents } from "@/lib/source-ingestion";

type FixtureEvent = NormalizedSourceEvent & {
  roadSlug: string;
};

async function main() {
  const fixturePath = join(process.cwd(), "fixtures", "source-events.json");
  const fixtureEvents = JSON.parse(await readFile(fixturePath, "utf8")) as FixtureEvent[];
  const roadSlugs = [...new Set(fixtureEvents.map((event) => event.roadSlug))];
  const results = [];

  for (const roadSlug of roadSlugs) {
    const road = await prisma.roadAsset.findUnique({
      where: { slug: roadSlug },
      select: { id: true, slug: true },
    });

    if (!road) {
      throw new Error(`Road fixture target not found: ${roadSlug}`);
    }

    const eventsForRoad = fixtureEvents.filter((event) => event.roadSlug === roadSlug);
    const eventsBySource = new Map<ObservationSource, NormalizedSourceEvent[]>();

    for (const event of eventsForRoad) {
      const events = eventsBySource.get(event.source) ?? [];
      events.push(event);
      eventsBySource.set(event.source, events);
    }

    for (const adapter of createFixtureAdapters(Object.fromEntries(eventsBySource))) {
      results.push(await ingestSourceEvents(road.id, adapter));
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
