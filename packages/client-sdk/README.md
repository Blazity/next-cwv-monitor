# cwv-monitor-sdk

React client SDK for the Core Web Vitals monitor.

## Usage

Pick the entrypoint that matches your Next.js router:
(The `cwv-monitor-sdk` root import is intentionally not exported.)

### App Router (`app/`)

```tsx
import { CWVMonitor } from 'cwv-monitor-sdk/app-router';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CWVMonitor projectId="YOUR_PROJECT_UUID" endpoint="https://your-monitor.example">
      {children}
    </CWVMonitor>
  );
}
```

### Pages Router (`pages/`)

```tsx
import { CWVMonitor } from 'cwv-monitor-sdk/pages-router';

export function App({ Component, pageProps }: any) {
  return (
    <CWVMonitor projectId="YOUR_PROJECT_UUID" endpoint="https://your-monitor.example">
      <Component {...pageProps} />
    </CWVMonitor>
  );
}
```

Track custom events:

```tsx
import { useTrackCustomEvent } from 'cwv-monitor-sdk/app-router';

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
- Events include both:
  - `path`: the concrete URL path (e.g. `/blog/hello-world`)
  - `route`: a parameterized route template (e.g. `/blog/[slug]`), when the framework router can provide it (Next.js Pages/App Router).

## Session ID / privacy

- The SDK uses a random `sessionId` **in memory** and attaches it to both CWV events and custom events.
- It is **not persisted** (no cookies / `localStorage` / `sessionStorage`).
- The session id is rotated on every page view, so you can treat each view as a separate session without tracking users across browser sessions.
- CWV sampling is applied **per page view** (all vitals for a single page view are either included or excluded together).
