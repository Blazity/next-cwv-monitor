CREATE TABLE IF NOT EXISTS cwv_stats_hourly
(
    project_id UUID,
    route String,
    device_type LowCardinality(String),
    metric_name LowCardinality(String),
    hour DateTime,
    sum_value AggregateFunction(sum, Float64),
    sum_squares AggregateFunction(sum, Float64),
    count_value AggregateFunction(count, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(hour)
ORDER BY (project_id, hour, metric_name, route, device_type)
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
    sumState(metric_value) AS sum_value,
    sumState(metric_value * metric_value) AS sum_squares,
    countState() AS count_value
FROM cwv_events
GROUP BY project_id, route, device_type, metric_name, hour;

CREATE VIEW IF NOT EXISTS v_cwv_anomalies AS
WITH 
    toStartOfHour(now()) AS current_hour_mark,
    current_hour AS (
        SELECT 
            project_id, route, device_type, metric_name, hour,
            sumMerge(sum_value) / countMerge(count_value) AS avg_val,
            countMerge(count_value) AS n
        FROM cwv_stats_hourly
        WHERE hour >= current_hour_mark - INTERVAL 1 HOUR
        GROUP BY project_id, route, device_type, metric_name, hour
    ),
    baseline_stats AS (
        SELECT 
            project_id, route, device_type, metric_name,
            sumMerge(sum_value) / countMerge(count_value) AS b_avg,
            sqrt(max2((sumMerge(sum_squares) / countMerge(count_value)) - pow(b_avg, 2), 0)) AS b_stddev,
            countMerge(count_value) AS b_n
        FROM cwv_stats_hourly
        WHERE hour >= current_hour_mark - INTERVAL 7 DAY 
          AND hour < current_hour_mark - INTERVAL 1 HOUR
        GROUP BY project_id, route, device_type, metric_name
    )   
SELECT
    lower(hex(MD5(concat(
        toString(curr.project_id), 
        curr.route, 
        curr.metric_name, 
        curr.device_type, 
        toString(curr.hour)
    )))) AS anomaly_id,
    curr.project_id, curr.route, curr.metric_name, curr.device_type,
    curr.hour AS detection_time,
    curr.avg_val AS current_avg,
    base.b_avg AS baseline_avg,
    base.b_stddev AS baseline_stddev,
    (curr.avg_val - base.b_avg) / IF(base.b_stddev = 0, 0.00001, base.b_stddev) AS z_score,
    curr.n AS sample_size
FROM current_hour curr
JOIN baseline_stats base ON 
    curr.project_id = base.project_id AND 
    curr.route = base.route AND 
    curr.metric_name = base.metric_name AND
    curr.device_type = base.device_type
WHERE curr.n >= 20 AND base.b_n >= 100;

CREATE TABLE IF NOT EXISTS processed_anomalies
(
    anomaly_id String, 
    project_id UUID,
    metric_name LowCardinality(String),
    route String,
    last_z_score Float64,
    notified_at DateTime DEFAULT now(),
    status Enum8('new' = 1, 'notified' = 2, 'acknowledged' = 3, 'resolved' = 4) DEFAULT 'new'
)
ENGINE = ReplacingMergeTree()
ORDER BY (project_id, anomaly_id);

CREATE ROLE IF NOT EXISTS r_ai_analyst;
GRANT SELECT ON cwv_events TO r_ai_analyst;
GRANT SELECT ON custom_events TO r_ai_analyst;
GRANT SELECT ON cwv_daily_aggregates TO r_ai_analyst;
GRANT SELECT ON cwv_stats_hourly TO r_ai_analyst;
GRANT SELECT ON v_cwv_anomalies TO r_ai_analyst;
GRANT SELECT ON projects TO r_ai_analyst;
GRANT SELECT, INSERT, UPDATE ON processed_anomalies TO r_ai_analyst;

CREATE USER IF NOT EXISTS ai_analyst_user 
IDENTIFIED WITH sha256_password BY 'ai_analyst_password';
GRANT r_ai_analyst TO ai_analyst_user;
ALTER USER ai_analyst_user DEFAULT ROLE r_ai_analyst;