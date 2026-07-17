export function assertProductionDatabaseUrl(
  databaseUrl: string,
  runtimeMode = process.env.ROADWATCH_RUNTIME_MODE ?? "development",
) {
  if (runtimeMode === "production" && !databaseUrl.startsWith("postgresql://")) {
    throw new Error(
      "RoadWatch production runtime requires a PostgreSQL DATABASE_URL. SQLite is local development only.",
    );
  }
}
