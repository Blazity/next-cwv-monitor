CREATE TABLE IF NOT EXISTS user (
  id String,
  name String,
  email String,
  email_verified Bool DEFAULT false,
  image Nullable(String),
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
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
  user_id String
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

CREATE TABLE IF NOT EXISTS account (
  id String,
  account_id String,
  provider_id String,
  user_id String,
  access_token Nullable(String),
  refresh_token Nullable(String),
  id_token Nullable(String),
  access_token_expires_at Nullable(DateTime),
  refresh_token_expires_at Nullable(DateTime),
  password Nullable(String),
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

CREATE TABLE IF NOT EXISTS verification (
  id String,
  identifier String,
  value String,
  expires_at DateTime,
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;
