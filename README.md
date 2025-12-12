# next-cwv-monitor

A self-hosted Core Web Vitals monitoring platform for Next.js applications. Provides real-user monitoring (RUM) with route-level granularity and business metric correlation, positioned as a free alternative to Vercel Analytics with deeper Next.js integration.

# Requirements

- Nodejs v20>=
- Pnpm v10.1>=
- Docker, Docker compose,

## Nice to have (for contributors)

- Eslint vscode extension [LINK](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- Prettier Legacy (It supports flat config) [LINK](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

# Quick structure description

```
├─ docker
   ├─ demo - Runs demo nextjs app and monitor app
   └─ monitor - Runs only monitor app
├─ apps
|  ├─ client-app - Demo application writen within nextjs 16
|  └─ monitor-app - Monitoring application, includes dashboard + REST API
└─ packages
   └─ client-sdk - Communication layer between client and monitor, written with react
```

![App diagram](app-diagram.png)

# How to run develop mode

To develop client-sdk you can run

- With one terminal - `pnpm dev`
- Multi terminal
  - monitor app - `cd apps/monitor-app && pnpm dev`
  - client app - `cd apps/client-app && pnpm dev`
  - client sdk - `cd packages/client-sdk && pnpm build`

# SDK Features

- A custom sendBeacon method that was created using the native fetch API. Thanks to this, the application supports cases where a server-side error occurs and allows you to ensure that the data has been sent.

## ClickHouse Schema

For details about the multi-tenant ClickHouse schema (tables, columns, and engine choices), see `apps/monitor-app/clickhouse/SCHEMA.md`.
