# cwv-monitor-sdk

A lightweight React SDK for monitoring Core Web Vitals and custom events in Next.js applications. It features automatic session rotation, smart batching, and zero-persistence privacy.

## Features

* ⚡️ **Zero Config Vitals:** Automatically tracks LCP, INP, CLS, FCP, and TTFB.
* 🔄 **Dual-Router Support:** First-class support for both Next.js App Router and Pages Router.
* 🛡 **Privacy First:** No cookies or `localStorage`. Uses in-memory session IDs that rotate on every page view.
* 📦 **Smart Batching:** Events are debounced and batched to minimize network overhead and impact on the main thread.
* 📊 **Route Normalization:** Automatically transforms concrete paths (e.g., `/blog/my-post`) into parameterized routes (e.g., `/blog/[slug]`) for cleaner grouping.

## Installation

    npm install @next-cwv-monitor/cwv-monitor-sdk
    

## Usage

Select the entry point that matches your Next.js architecture. The SDK is split into specific entry points to ensure router-specific optimizations are not bundled unnecessarily.

### App Router (`app/`)

Wrap your root layout or a provider component.

```tsx
import { CWVMonitor } from 'cwv-monitor-sdk/app-router';
    
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CWVMonitor 
          projectId="YOUR-PROJECT-UUID" 
          endpoint="https://your-monitor-api.com"
          sampleRate={0.5} // Optional: track 50% of page views
        >
          {children}
        </CWVMonitor>
      </body>
    </html>
  );
}
```

### Pages Router (`pages/`)

Wrap your application in app.tsx.

```tsx
import type { AppProps } from 'next/app';
import { CWVMonitor } from 'cwv-monitor-sdk/pages-router';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CWVMonitor projectId="YOUR-PROJECT-UUID" endpoint="https://your-monitor-api.com">
      <Component {...pageProps} />
    </CWVMonitor>
  );
}
```

### Tracking Custom Events

Use the hook to track business logic events (like conversions). These are never sampled and always delivered.

```tsx
import { useTrackCustomEvent } from 'cwv-monitor-sdk/app-router'; // or /pages-router

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

## API Reference

### `CWVMonitor` Props

| Prop | Type | Description |
| --- | --- | --- |
| `projectId` | `string` | **Required.** Your unique project identifier. |
| `endpoint` | `string` | **Required.** The base URL of your ingestion server. |
| `sampleRate` | `number` | Value between 0 and 1. Default is `1` (100%). |
| `abortTime` | `number` | Optional timeout in ms for ingest requests. |

### `useTrackCustomEvent()`

Returns: `(name: string, options?: TrackCustomEventOptions) => void`

| Option | Type | Description |
| --- | --- | --- |
| `route` | `string` | Override the detected route name (e.g., /custom-route). |
| `path` | `string` | Override the detected URL path. |
| `recordedAt` | `string` | Override the timestamp (ISO string). |

## Technical Details

### Core Web Vitals Captured

The SDK utilizes the `web-vitals` library to capture the following metrics:

| Metric | Name | Description |
| --- | --- | --- |
| **LCP** | Largest Contentful Paint | Measures loading performance. |
| **INP** | Interaction to Next Paint | Measures responsiveness to user input. |
| **CLS** | Cumulative Layout Shift | Measures visual stability. |
| **FCP** | First Contentful Paint | Time until the first bit of content is rendered. |
| **TTFB** | Time to First Byte | Measures server responsiveness. |

### Sampling Logic Detail

Sampling is applied strictly to **Web Vital events**.

If the decision is `false`, the SDK will still track `$page_view` and any custom events triggered via `useTrackCustomEvent`, but it will skip the heavy lifting of calculating and sending performance metrics. This allows you to maintain accurate conversion data (e.g., "Purchases per Page View") while saving on ingestion costs for performance data.

### Deployment & Compatibility

* **Environment**: Works in all modern browsers (Chrome, Edge, Firefox, Safari).
* **Frameworks**: Requires **Next.js 13+**, **React 18+**
* **Tree Shaking**: The SDK is modular. If you only import from `app-router`, the `pages-router` logic will be excluded from your production bundle.

### Event Batching & Delivery

Events are sent to `POST /api/ingest`. To prevent performance bottlenecks, the queue flushes based on these triggers:

* Threshold: When at least 10 items are queued.
* Debounce: 50ms after the last recorded event (trailing debounce).
* Unload: Best-effort delivery via navigator.sendBeacon (using keepalive: true) when a user closes the tab.
* Retries: Automatic exponential backoff (up to 3 retries) for failed requests.

### Page Views & Route Reconstruction

Page views are tracked automatically (as a system event named `$page_view`) and can be used as the denominator for conversion rates. Every event includes:

* `path`: the concrete URL path (e.g. `/blog/hello-world`)
* `route`: a parameterized route template (e.g. `/blog/[slug]`). The SDK reconstructs this by comparing the pathname against active URL parameters, allowing you to aggregate data by page type.

### Privacy & Sessions

* In-Memory: Session IDs are generated at runtime and **never** stored in cookies or browser storage.
* Rotation: The session id is rotated on every page view, so you can treat each view as a separate session without tracking users across browser sessions.
* Sampling: Decisions are made **per page view**. If a view is sampled, all Web Vitals for that specific view are captured to ensure a complete performance profile.

## Internal Architecture

The SDK is composed of three main layers that ensure performance data is captured accurately without impacting the main thread's performance.

1. **Tracker Layer (Routing & Context)**: Specifically optimized for Next.js, this layer monitors router state changes using `AppRouterRouteTracker` and `PagesRouterRouteTracker` components. It automatically reconstructs parameterized routes (e.g., `/blog/[slug]`) to ensure data is aggregated by route template rather than raw URLs.
2. **Logic Layer (Hooks)**: Powered by the `web-vitals` library, this layer manages the collection of performance metrics. They use a "Ref-Routing" pattern to ensure that even though listeners are registered only once, they always dispatch to the most current configuration and session state.
3. **Persistence Layer (Ingest Queue)**: A specialized class that manages an in-memory `Set` of events. It handles the logic for sampling, batching, and the "last-gasp" delivery of data during page unloads.

## Data Contracts

When the SDK flushes data, it sends a `POST` request to `{endpoint}/api/ingest` with the following JSON structure:

### The Ingest Payload

```json
{
  "projectId": "YOUR_PROJECT_UUID",
  "events": [
    {
      "sessionId": "f984c0df-89ce-4c04-90e9-58bcc8bf1e91",
      "route": "/blog/[slug]",
      "path": "/blog/hello-world",
      "metric": "LCP",
      "value": 2400.5,
      "rating": "good",
      "recordedAt": "2026-01-05T18:25:00.000Z"
    }
  ],
  "customEvents": [
    {
      "name": "purchase",
      "sessionId": "f984c0df-89ce-4c04-90e9-58bcc8bf1e91",
      "route": "/blog/[slug]",
      "path": "/blog/hello-world",
      "recordedAt": "2026-01-05T18:25:05.000Z"
    }
  ]
}

```

## Implementation Details

### Page View Logic & Sampling

Sampling is "Sticky" per page view. When a user lands on a page (or navigates to a new one):

1. A new `sessionId` is generated.
2. A sampling decision is made based on your `sampleRate`.
3. If the view is **not** sampled, all subsequent Core Web Vital events for that session are dropped.
4. **Note:** Custom events and the `$page_view` event are **not** sampled; they are always sent to ensure you have an accurate denominator for conversion metrics.

### Next.js Route Reconstruction

The SDK uses a custom utility to reverse-engineer the route template in the App Router. Because Next.js doesn't natively expose the template (like `/shop/[id]`) to the client-side `usePathname()` hook, the SDK:

* Extracts the raw pathname.
* Maps active URL parameters back into the string.
* Identifies "Catch-all" routes (e.g., `[...slug]`) by finding contiguous matches in the segment array.

## FAQ

**Q: Does this SDK impact my Lighthouse score?** A: Minimally. With total bundle size (`web-vitals` included) under 5KB, the SDK uses a very small footprint, and the `web-vitals` library it depends on is the industry standard for low-impact monitoring. Batching and the 50ms debounce ensure that the main thread is not choked by frequent network requests.

**Q: Why is my session ID changing every time I click a link?** A: This is intentional. The SDK treats every "Route Change" as a fresh "View Session." This simplifies the math for Core Web Vitals (which are often specific to the lifecycle of a single page load) and ensures user privacy and GDPR compliance.
