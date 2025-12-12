CREATE TABLE IF NOT EXISTS projects
(
    id UUID,
    slug String,
    name String,
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (id);

CREATE TABLE IF NOT EXISTS cwv_events
(
    project_id UUID,
    session_id String,
    route String,
    path String,
    device_type LowCardinality(String),
    metric_name LowCardinality(String),
    metric_value Float64,
    rating LowCardinality(String),
    recorded_at DateTime64(3, 'UTC') DEFAULT now64(3, 'UTC'),
    ingested_at DateTime64(3, 'UTC') DEFAULT now64(3, 'UTC')
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (project_id, route, metric_name, recorded_at, session_id)
TTL toDateTime(recorded_at) + INTERVAL 90 DAY DELETE;

CREATE TABLE IF NOT EXISTS cwv_daily_aggregates
(
    project_id UUID,
    route String,
    device_type LowCardinality(String),
    metric_name LowCardinality(String),
    event_date Date,
    quantiles AggregateFunction(quantiles(0.5, 0.75, 0.9, 0.95, 0.99), Float64),
    sample_size AggregateFunction(count, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (project_id, route, device_type, metric_name, event_date)
TTL event_date + INTERVAL 365 DAY DELETE;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cwv_daily_aggregates
TO cwv_daily_aggregates
AS
SELECT
    project_id,
    route,
    device_type,
    metric_name,
    toDate(recorded_at) AS event_date,
    quantilesState(0.5, 0.75, 0.9, 0.95, 0.99)(metric_value) AS quantiles,
    countState() AS sample_size
FROM cwv_events
GROUP BY
    project_id,
    route,
    device_type,
    metric_name,
    event_date;
