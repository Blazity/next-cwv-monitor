export const METRIC_INFO = {
    LCP: {
      name: "Largest Contentful Paint",
      friendlyLabel: "Loading speed",
      description: "Measures loading performance - time until the largest content element is visible.",
    },
    INP: {
      name: "Interaction to Next Paint",
      friendlyLabel: "Interactivity",
      description: "Measures responsiveness - the latency of all user interactions on the page.",
    },
    CLS: {
      name: "Cumulative Layout Shift",
      friendlyLabel: "Visual stability",
      description: "Measures visual stability - unexpected layout shifts during page life.",
    },
    FCP: {
      name: "First Contentful Paint",
      friendlyLabel: "First paint",
      description: "Time until the first bit of content is rendered on screen.",
    },
    TTFB: {
      name: "Time to First Byte",
      friendlyLabel: "Server response",
      description: "Time until the first byte of response is received from the server.",
    },
  } as const;