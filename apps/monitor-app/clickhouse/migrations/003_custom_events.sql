CREATE TABLE IF NOT EXISTS custom_events
(
    project_id UUID,
    session_id String,
    route String,
    path String,
    device_type LowCardinality(String),
    event_name LowCardinality(String),
    recorded_at DateTime64(3, 'UTC') DEFAULT now64(3, 'UTC'),
    ingested_at DateTime64(3, 'UTC') DEFAULT now64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (project_id, route, event_name, recorded_at, session_id)
TTL toDateTime(recorded_at) + INTERVAL 90 DAY DELETE;
