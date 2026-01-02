ALTER TABLE user
ADD COLUMN role String DEFAULT 'user',
ADD COLUMN banned Bool DEFAULT false,
ADD COLUMN is_password_temporary Bool Default false,
ADD COLUMN ban_reason Nullable(String),
ADD COLUMN ban_expires Nullable(DateTime);

ALTER TABLE session
ADD COLUMN impersonated_by Nullable(String);