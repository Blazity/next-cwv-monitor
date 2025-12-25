ALTER TABLE user
ADD COLUMN role String DEFAULT 'member',
ADD COLUMN banned Bool DEFAULT false,
ADD COLUMN ban_reason Nullable(String),
ADD COLUMN ban_expires Nullable(DateTime);

ALTER TABLE session
ADD COLUMN impersonated_by Nullable(String);