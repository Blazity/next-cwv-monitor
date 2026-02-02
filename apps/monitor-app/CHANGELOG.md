# cwv-monitor-app

## 1.2.0

### Minor Changes

- 132ca7b: Add hourly interval view and enhanced time range options
  - Added interval options (hour, day, week, month) for dashboard metrics with combined labels (e.g., "7d / 1h")
  - Dashboard components and charts now respect and propagate selected intervals for accurate time-series data

### Patch Changes

- f0dd992: Change text color in metric selector to improve contrast
- b667edf: Update DataRefreshControl component design
  - Removed gray background from auto-refresh button for cleaner UI
  - Updated component styling with improved visual hierarchy and spacing
  - Enhanced typography with better font sizes and weights

## 1.1.0

### Minor Changes

- a6ac517: Fixed events page, settings page, and regressions/routes page skeletons. Introduced auto-refresh toggle, data freshness indicator, and parallel data fetching for improved performance. Fixed CORS restrictions for ingest endpoint. Various UI fixes for tooltips, page header, and responsive layouts.
