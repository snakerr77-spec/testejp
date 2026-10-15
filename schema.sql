CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY,
  profile_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS candidates_created_at ON candidates(created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_candidate_id ON documents(candidate_id);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  email TEXT NOT NULL COLLATE NOCASE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Colaborador',
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS mfa_challenges_email_created ON mfa_challenges(email, created_at DESC);
