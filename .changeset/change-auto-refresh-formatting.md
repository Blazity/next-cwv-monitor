---
"cwv-monitor-app": patch
---

Simplify auto-refresh countdown formatting

- Replaced `date-fns` `formatDuration`/`intervalToDuration` with a lightweight manual formatter for the countdown display
