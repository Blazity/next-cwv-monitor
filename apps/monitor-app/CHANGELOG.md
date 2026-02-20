# cwv-monitor-app

## 1.4.0

### Minor Changes

- 86009a7: Add interactive drag-to-select range selection for time series charts
- c22b23f: Add incomplete data indicator to charts
  - Display a dashed line on the current (incomplete) period in time series and analytics charts
  - Show "Partial" badge in tooltips when hovering over the incomplete data point
  - Add legend entry for the partial data indicator in the trend chart

- 860808d: Upgrade node version to current LTS

## 1.3.0

### Minor Changes

- 2a05659: Add time series charts multi-overlay support

### Patch Changes

- 9a23afd: Simplify auto-refresh countdown formatting
  - Replaced `date-fns` `formatDuration`/`intervalToDuration` with a lightweight manual formatter for the countdown display

- 03ba9f9: Normalize custom event names to lowercase
- 4cf4c2c: Fix project card title/domain overflow by ensuring flex truncation works correctly.
- 889fb19: Move Users link to user actions section in mobile menu and desktop

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
