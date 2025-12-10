-- Auth tables migration
-- Using ReplacingMergeTree for auth tables since they require updates/upserts
-- The updatedAt column is used as the version to keep the most recent row

CREATE TABLE IF NOT EXISTS user (
  id String,
  name String,
  email String,
  emailVerified UInt8 DEFAULT 0,
  image Nullable(String),
  createdAt DateTime DEFAULT now(),
  updatedAt DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY id;

CREATE TABLE IF NOT EXISTS session (
  id String,
  expiresAt DateTime,
  token String,
  createdAt DateTime DEFAULT now(),
  updatedAt DateTime DEFAULT now(),
  ipAddress Nullable(String),
  userAgent Nullable(String),
  userId String
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY id;

CREATE TABLE IF NOT EXISTS account (
  id String,
  accountId String,
  providerId String,
  userId String,
  accessToken Nullable(String),
  refreshToken Nullable(String),
  idToken Nullable(String),
  accessTokenExpiresAt Nullable(DateTime),
  refreshTokenExpiresAt Nullable(DateTime),
  scope Nullable(String),
  password Nullable(String),
  createdAt DateTime DEFAULT now(),
  updatedAt DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY id;

CREATE TABLE IF NOT EXISTS verification (
  id String,
  identifier String,
  value String,
  expiresAt DateTime,
  createdAt DateTime DEFAULT now(),
  updatedAt DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY id;
