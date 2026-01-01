ALTER TABLE projects
ADD COLUMN events_display_settings Nullable(String) CODEC(ZSTD);