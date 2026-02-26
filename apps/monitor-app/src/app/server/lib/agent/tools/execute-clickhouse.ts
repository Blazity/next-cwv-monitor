import { tool } from "ai";
import z from "zod";
import { logger } from "@/app/server/lib/logger";
import { agentSql } from "@/app/server/lib/agent/agent-clickhouse-client";

const MAX_ROWS = 200;

export const executeClickHouse = tool({
  description:
    "Execute a read-only SQL query against the ClickHouse database. " +
    "Returns rows as JSON objects, column names, row count, and execution time. " +
    "Only SELECT queries are allowed. ",
  inputSchema: z.object({
    sql: z.string().min(1),
    explanation: z.string().describe("Brief explanation of what this query does and why"),
  }),
  execute: async ({ sql, explanation }) => {
    logger.info({ explanation }, `[ExecuteSQL] ${sql}`);

    try {
      const startTime = Date.now();

      const rows = await agentSql`${agentSql.raw(sql)}`;

      const executionTime = Date.now() - startTime;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const limitedRows = rows.slice(0, MAX_ROWS);

      logger.info(`[ExecuteSQL] Completed in ${executionTime}ms, ${rows.length} rows`);

      return {
        rows: limitedRows,
        columns,
        rowCount: rows.length,
        truncated: rows.length > MAX_ROWS,
        executionTime,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[ExecuteSQL] Error: ${message}`);

      return {
        error: message,
        rows: [],
        columns: [],
        rowCount: 0,
      };
    }
  },
});
