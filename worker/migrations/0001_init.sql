CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  lang TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  attempt_id TEXT NOT NULL
);
