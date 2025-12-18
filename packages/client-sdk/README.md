# cwv-monitor-sdk

React client SDK for the Core Web Vitals monitor.

## Usage

Wrap your app with `CWVMonitor` (e.g. in your root `Providers`):

```tsx
import { CWVMonitor } from 'cwv-monitor-sdk';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CWVMonitor projectId="YOUR_PROJECT_UUID" endpoint="https://your-monitor.example">
      {children}
    </CWVMonitor>
  );
}
```

Track custom events:

```tsx
import { useTrackCustomEvent } from 'cwv-monitor-sdk';

export function CheckoutButton() {
  const trackCustomEvent = useTrackCustomEvent();

  return (
    <button
      onClick={() => {
        trackCustomEvent('purchase');
      }}
    >
      Purchase
    </button>
  );
}
```

## How batching works

- Events are sent to `POST /api/ingest`.
- Flush triggers:
  - when at least 10 items are queued, or
  - 50ms after the last event (trailing debounce), or
  - on page unload (best-effort).

## Page views

- Page views are tracked automatically (as a system event named `$page_view`) and can be used as the denominator for conversion rates.

## Session ID / privacy

- The SDK uses a random `sessionId` **in memory** and attaches it to both CWV events and custom events.
- It is **not persisted** (no cookies / `localStorage` / `sessionStorage`).
- The session id is rotated on every page view, so you can treat each view as a separate session without tracking users across browser sessions.
- CWV sampling is applied **per page view** (all vitals for a single page view are either included or excluded together).
