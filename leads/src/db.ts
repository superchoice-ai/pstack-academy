export type SqlValue = string | number | null;

export type QueryMeta = {
  changes: number;
};

export type QueryResult<T> = {
  results: T[] | null;
  success: boolean;
  meta: QueryMeta;
};

export interface BoundStatement {
  bind(...values: SqlValue[]): BoundStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  run(): Promise<QueryResult<Record<string, unknown>>>;
}

export interface LeadDb {
  prepare(sql: string): BoundStatement;
  batch<T = Record<string, unknown>>(statements: BoundStatement[]): Promise<QueryResult<T>[]>;
}

export type AssetFetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export type LeadsEnv = {
  DB: LeadDb;
  LEADS_API_TOKEN?: string;
  LEADS_UNSUBSCRIBE_SECRET?: string;
  ASSETS?: AssetFetcher;
};
