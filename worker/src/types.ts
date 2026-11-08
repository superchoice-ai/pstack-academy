export type CertificateRow = {
  id: string;
  name: string;
  score: number;
  lang: string;
  issued_at: string;
  attempt_id: string;
};

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Like {
  prepare(sql: string): D1Statement;
}

export type Env = {
  DB: D1Like;
  TURNSTILE_SECRET_KEY?: string;
};
