import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";

import type { BoundStatement, LeadDb, QueryResult, SqlValue } from "../src/db";

export function migrationSql(): string {
  return readFileSync(new URL("../migrations/0001_leads.sql", import.meta.url), "utf8");
}

class SqliteStatement implements BoundStatement {
  constructor(
    private readonly sqlite: Database,
    private readonly sql: string,
    private readonly params: SqlValue[] = [],
  ) {}

  bind(...values: SqlValue[]): BoundStatement {
    return new SqliteStatement(this.sqlite, this.sql, values);
  }

  execute(): QueryResult<Record<string, unknown>> {
    const query = this.sqlite.query(this.sql);
    const params = this.params as Array<string | number | null>;
    if (/^\s*(select|with)\b/i.test(this.sql)) {
      const results = query.all(...params) as Record<string, unknown>[];
      return { results, success: true, meta: { changes: 0 } };
    }
    const info = query.run(...params);
    return { results: [], success: true, meta: { changes: Number(info.changes) } };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const row = this.execute().results?.[0] as T | undefined;
    return row ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    return this.execute() as QueryResult<T>;
  }

  async run(): Promise<QueryResult<Record<string, unknown>>> {
    return this.execute();
  }
}

class SqliteD1 implements LeadDb {
  constructor(readonly sqlite: Database) {}

  prepare(sql: string): BoundStatement {
    return new SqliteStatement(this.sqlite, sql);
  }

  async batch<T = Record<string, unknown>>(
    statements: BoundStatement[],
  ): Promise<QueryResult<T>[]> {
    const results: QueryResult<T>[] = [];
    const txn = this.sqlite.transaction(() => {
      for (const statement of statements) {
        if (!(statement instanceof SqliteStatement)) throw new Error("bad_statement");
        results.push(statement.execute() as QueryResult<T>);
      }
    });
    txn();
    return results;
  }

  close(): void {
    this.sqlite.close();
  }
}

export function openTestDb(): SqliteD1 {
  const sqlite = new Database(":memory:");
  sqlite.exec(migrationSql());
  return new SqliteD1(sqlite);
}
