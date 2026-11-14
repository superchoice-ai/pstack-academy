-- phone and line_id already exist on leads from 0001 (NOT NULL DEFAULT '').
-- Add line_url the same way. Rebuild touches so channel may be
-- email, line, imessage, or whatsapp. Existing touch rows are copied.
-- Applied once by wrangler (leads_migrations). Do not drop leads or
-- academy tables on this shared D1 database.

ALTER TABLE leads ADD COLUMN line_url TEXT NOT NULL DEFAULT '';

CREATE TABLE touches_new (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'line', 'imessage', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  subject TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL,
  client_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

INSERT INTO touches_new
SELECT id, lead_id, channel, direction, subject, summary, sent_at, client_ref, created_at
FROM touches;

DROP TABLE touches;

ALTER TABLE touches_new RENAME TO touches;

CREATE INDEX IF NOT EXISTS idx_touches_lead ON touches (lead_id, sent_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_touches_client_ref ON touches (lead_id, client_ref) WHERE client_ref <> '';

CREATE INDEX IF NOT EXISTS idx_touches_sent ON touches (direction, sent_at);
