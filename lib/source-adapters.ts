import type { IssueType, ObservationSource } from "@prisma/client";

export type NormalizedSourceEvent = {
  source: ObservationSource;
  sourceKey: string;
  sourceLabel: string;
  sourceReference?: string;
  sourceNote?: string;
  issueType?: IssueType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  observedAt: Date;
  payload?: Record<string, unknown>;
};

export interface SourceAdapter {
  readonly source: ObservationSource;
  readonly label: string;
  fetchEvents(): Promise<NormalizedSourceEvent[]>;
}

export class FixtureSourceAdapter implements SourceAdapter {
  readonly source: ObservationSource;
  readonly label: string;
  private readonly events: NormalizedSourceEvent[];

  constructor(
    source: ObservationSource,
    label: string,
    events: readonly NormalizedSourceEvent[],
  ) {
    this.source = source;
    this.label = label;
    this.events = events.map((event) => ({
      ...event,
      source,
      sourceLabel: event.sourceLabel || label,
    }));
  }

  async fetchEvents() {
    return this.events.map((event) => ({
      ...event,
      payload: event.payload ? { ...event.payload } : undefined,
    }));
  }
}

export function createFixtureAdapters(
  fixtures: Partial<Record<ObservationSource, readonly NormalizedSourceEvent[]>>,
): SourceAdapter[] {
  return (Object.entries(fixtures) as Array<[
    ObservationSource,
    readonly NormalizedSourceEvent[] | undefined,
  ]>)
    .filter((entry): entry is [ObservationSource, readonly NormalizedSourceEvent[]] => Boolean(entry[1]))
    .map(([source, events]) => new FixtureSourceAdapter(source, source, events));
}
