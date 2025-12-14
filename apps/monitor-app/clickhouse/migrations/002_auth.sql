CREATE TABLE IF NOT EXISTS user (
  id String,
  name String,
  email String,
  email_verified Bool DEFAULT false,
  image Nullable(String),
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now(),
  INDEX idx_user_email email TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

CREATE TABLE IF NOT EXISTS session (
  id String,
  expires_at DateTime,
  token String,
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now(),
  ip_address Nullable(String),
  user_agent Nullable(String),
  user_id String,
  INDEX idx_session_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY token
TTL expires_at DELETE;

CREATE TABLE IF NOT EXISTS account (
  id String,
  account_id String,
  provider_id LowCardinality(String),
  user_id String,
  access_token Nullable(String),
  refresh_token Nullable(String),
  id_token Nullable(String),
  access_token_expires_at Nullable(DateTime),
  refresh_token_expires_at Nullable(DateTime),
  scope Nullable(String),
  password Nullable(String),
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now(),
  INDEX idx_account_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (provider_id, account_id);

CREATE TABLE IF NOT EXISTS verification (
  id String,
  identifier String,
  value String,
  expires_at DateTime,
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (identifier, value)
TTL expires_at DELETE;
