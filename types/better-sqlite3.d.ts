declare module "better-sqlite3" {
  type Statement = {
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };

  class Database {
    constructor(path: string, options?: { readonly?: boolean });
    prepare(sql: string): Statement;
    close(): void;
  }

  export default Database;
}
