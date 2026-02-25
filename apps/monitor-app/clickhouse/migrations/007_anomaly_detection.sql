CREATE TABLE IF NOT EXISTS cwv_stats_hourly
(
    project_id UUID,
    route String,
    device_type LowCardinality(String),
    metric_name LowCardinality(String),
    hour DateTime,
    avg_state AggregateFunction(avg, Float64),
    var_state AggregateFunction(varSampStable, Float64), 
    count_state AggregateFunction(count, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(hour)
ORDER BY (project_id, hour, route, device_type, metric_name)
TTL hour + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cwv_stats_hourly
TO cwv_stats_hourly
AS
SELECT
    project_id,
    route,
    device_type,
    metric_name,
    toStartOfHour(recorded_at) AS hour,
    avgState(log1p(metric_value)) AS avg_state,
    varSampStableState(log1p(metric_value)) AS var_state,
    countState() AS count_state
FROM cwv_events
GROUP BY project_id, hour, route, device_type, metric_name;

INSERT INTO cwv_stats_hourly
SELECT
    project_id,
    route,
    device_type,
    metric_name,
    toStartOfHour(recorded_at) AS hour,
    avgState(log1p(metric_value)) AS avg_state,
    varSampStableState(log1p(metric_value)) AS var_state,
    countState() AS count_state
FROM cwv_events
WHERE recorded_at >= toStartOfHour(now()) - INTERVAL 7 DAY
GROUP BY project_id, hour, route, device_type, metric_name;

CREATE VIEW IF NOT EXISTS v_cwv_anomalies AS
WITH 
    toStartOfHour(now()) AS current_hour_mark,
    current_hour_mark - INTERVAL 1 HOUR AS gap_hour,
    current_hour_mark - INTERVAL 7 DAY AS baseline_start
SELECT
    lower(hex(MD5(concat(
        toString(project_id), '\0', route, '\0', metric_name, '\0', device_type, '\0', toString(current_hour_mark)
    )))) AS anomaly_id,
    project_id, route, metric_name, device_type,
    current_hour_mark AS detection_time,
    
    avgMergeIf(avg_state, hour = current_hour_mark) AS log_avg_curr,
    avgMergeIf(avg_state, hour >= baseline_start AND hour < gap_hour) AS log_avg_base,
    sqrt(varSampStableMergeIf(var_state, hour >= baseline_start AND hour < gap_hour)) AS log_stddev_base,
    
    exp(log_avg_curr) - 1 AS current_avg_raw,
    exp(log_avg_base) - 1 AS baseline_avg_raw,
    
    countMergeIf(count_state, hour = current_hour_mark) AS sample_size,
    countMergeIf(count_state, hour >= baseline_start AND hour < gap_hour) AS baseline_n,
    
    (log_avg_curr - log_avg_base) / IF(log_stddev_base = 0, 0.00001, log_stddev_base) AS z_score
FROM cwv_stats_hourly
WHERE hour >= baseline_start
GROUP BY project_id, route, device_type, metric_name
HAVING sample_size >= 20 AND baseline_n >= 100;

CREATE TABLE IF NOT EXISTS processed_anomalies
(
    anomaly_id String, 
    project_id UUID,
    metric_name LowCardinality(String),
    route String,
    device_type LowCardinality(String),
    last_z_score Float64,
    notified_at DateTime DEFAULT now(),
    status Enum8('new' = 1, 'notified' = 2, 'acknowledged' = 3, 'resolved' = 4) DEFAULT 'new',
    updated_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (project_id, anomaly_id);

CREATE SETTINGS PROFILE IF NOT EXISTS ai_analyst_profile SETTINGS
    max_execution_time = 15,
    max_memory_usage = 2000000000,
    max_rows_to_read = 100000000;

CREATE ROLE IF NOT EXISTS r_ai_analyst;
GRANT SELECT ON cwv_events TO r_ai_analyst;
GRANT SELECT ON custom_events TO r_ai_analyst;
GRANT SELECT ON cwv_daily_aggregates TO r_ai_analyst;
GRANT SELECT ON cwv_stats_hourly TO r_ai_analyst;
GRANT SELECT ON v_cwv_anomalies TO r_ai_analyst;
GRANT SELECT ON projects TO r_ai_analyst;
GRANT SELECT, INSERT, ALTER UPDATE ON processed_anomalies TO r_ai_analyst;

CREATE USER IF NOT EXISTS ai_analyst_user 
IDENTIFIED WITH no_password;
GRANT r_ai_analyst TO ai_analyst_user;
ALTER USER ai_analyst_user DEFAULT ROLE r_ai_analyst;
ALTER USER ai_analyst_user SETTINGS PROFILE ai_analyst_profile;