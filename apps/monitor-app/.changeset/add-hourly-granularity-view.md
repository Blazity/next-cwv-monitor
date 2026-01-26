---
"cwv-monitor-app": minor
---

Add hourly granularity view and enhanced time range options

- Added granularity options (hour, day, week, month) for dashboard metrics with combined labels (e.g., "7d / 1h")
- Dashboard components and charts now respect and propagate selected intervals for accurate time-series data
- Extended demo seed data to 90 days with denser hourly events for recent 24h
- Updated backend queries to support interval-based data fetching
