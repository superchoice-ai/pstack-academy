-- Leads pipeline tables on the shared pstack-academy D1 database.
-- Applied only by the superchoice-leads worker. Wrangler records these files
-- in leads_migrations, not the academy worker's d1_migrations table.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  line_id TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  fit_score INTEGER NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  notes TEXT NOT NULL DEFAULT '',
  pain_point TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN (
      'new',
      'contacted',
      'replied',
      'talking',
      'proposal',
      'won',
      'lost',
      'opted_out',
      'bounced'
    )
  ),
  domain TEXT NOT NULL DEFAULT '',
  email_domain TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON leads (email) WHERE email <> '';

CREATE INDEX IF NOT EXISTS idx_leads_domain ON leads (domain) WHERE domain <> '';

CREATE INDEX IF NOT EXISTS idx_leads_email_domain ON leads (email_domain) WHERE email_domain <> '';

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);

CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads (updated_at);

CREATE TABLE IF NOT EXISTS touches (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'line')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  subject TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL,
  client_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_touches_lead ON touches (lead_id, sent_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_touches_client_ref ON touches (lead_id, client_ref) WHERE client_ref <> '';

CREATE INDEX IF NOT EXISTS idx_touches_sent ON touches (direction, sent_at);

CREATE TABLE IF NOT EXISTS opt_outs (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  lead_id TEXT,
  source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  CHECK (email <> '' OR domain <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opt_outs_email ON opt_outs (email) WHERE email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_opt_outs_domain ON opt_outs (domain) WHERE domain <> '';
