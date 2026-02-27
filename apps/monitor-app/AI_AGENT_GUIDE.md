# AI Agent Architecture & Integration Guide

This document outlines the bidirectional AI monitoring system for the CWV Monitor. It explains how the **Monitor App** acts as the analytical engine for **AI Agent (Slack/Teams Bot)**.

## 1. System Components

### Monitor App (`apps/monitor-app`)
The "Source of Truth" and Data Engine.
- **ClickHouse**: Stores all raw performance events and pre-aggregated metrics.
- **AiBridge**: A domain service that provides safe, high-level methods for the AI Agent to query data.
- **Schema Catalog**: A YAML definition (`clickhouse/catalog.yml`) that describes the database to the LLM.

### AI Agent
The interaction layer (Slack/Teams).
- **Inbound Handling**: Receives webhooks and message events from Slack/Teams.
- **LLM Brain**: Uses the `AiBridge` from the Monitor App to fetch context and execute diagnostic SQL.
- **Conversation State**: Tracks thread IDs and maps them to specific `anomaly_id`s.

### Anomaly Worker (`apps/anomaly-worker`)
The proactive trigger.
- Runs on a cron schedule.
- Scans ClickHouse for statistical anomalies (Z-Score > 3).
- Triggers the initial outbound notification via the Monitor App's `NotificationsService`.

---

## 2. Security Model

We follow the principle of **Least Privilege** for AI interactions:

- **Restricted User**: The Agent uses `ai_analyst_user` in ClickHouse.
- **Role-Based Access**: The `r_ai_analyst` role is limited to `SELECT` on core tables and `INSERT/UPDATE` only on the `processed_anomalies` audit table.
- **Resource Guardrails**: The `ai_analyst_profile` sets hard limits on memory (2GB), execution time (15s), and rows read (100M) to prevent the LLM from generating "expensive" or runaway queries.

---

## 3. Capabilities ("What can be done")

### Outbound Alerts
When an anomaly is detected, the `NotificationsService` sends a rich payload to Slack/Teams:
- **Investigate Button**: Links to the Monitor App Web UI.
- **Chat with AI Button**: Deep-links to the AI Agent to start a diagnostic conversation.
- **Metadata**: Includes `anomalyId`, `projectId`, and `metricName` so the Agent knows exactly what to talk about.

### Deep-Dive Context
The AI Agent can call `aiBridge.getAnomalyContext(anomalyId)` to receive a "Context Bundle":
1. **Anomaly Record**: Specifics about the z-score and metric.
2. **Project Info**: Domain and configuration.
3. **24h Trend**: Pre-fetched hourly averages for the last 24 hours.
4. **Schema Reference**: The `catalog.yml` content to help the LLM generate its own SQL.

### Dynamic SQL Execution
The Agent can ask the LLM to "Verify if this happens on other routes." The LLM generates a SQL query, and the Agent executes it via `aiBridge.executeSql(query, params)`.

---

## 4. Integration Pattern

To use the Monitor App domain in your  AI application:

```typescript
import { aiBridge } from "@monitor-app/app/server/domain/ai/service";

// 1. When a user clicks "Chat with AI" in Slack
async function handleChatStart(anomalyId: string) {
  // Get everything the LLM needs to know in one call
  const context = await aiBridge.getAnomalyContext(anomalyId);
  
  // Provide this context to your LLM system prompt
  const systemPrompt = `
    You are a Performance Expert. 
    Analyze this anomaly: ${JSON.stringify(context.anomaly)}
    Database Schema: ${context.schemaReference}
    ...
  `;
}

// 2. When the LLM wants to fetch more data
async function onLlmToolUse(generatedSql: string) {
  const results = await aiBridge.executeSql(generatedSql);
  return results;
}
```

## 5. Files Reference
- **Schema Catalog**: `apps/monitor-app/clickhouse/catalog.yml`
- **AI Domain Logic**: `apps/monitor-app/src/app/server/domain/ai/service.ts`
- **Notification Logic**: `apps/monitor-app/src/app/server/domain/notifications/`
