import { tool } from "ai";
import z from "zod";
import { logger } from "@/app/server/lib/logger";
import { agentSql } from "@/app/server/lib/agent/agent-clickhouse-client";

const PREVIEW_ROWS = 10;
const FULL_DATA_THRESHOLD = 50;
const MAX_ROWS = 200;

const rowsToCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => String(row[col] ?? "")).join(",")).join("\n");
  return `${header}\n${body}`;
};

export const executeClickHouse = tool({
  description:
    "Execute a read-only SQL query against the ClickHouse database. " +
    "Returns rows as CSV, total row count, and execution time. " +
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
      const totalRows = rows.length;

      logger.info(`[ExecuteSQL] Completed in ${executionTime}ms, ${totalRows} rows`);

      if (totalRows === 0) {
        return { csv: "", totalRows: 0, executionTime };
      }

      if (totalRows > MAX_ROWS) {
        return {
          csv: rowsToCsv(rows.slice(0, PREVIEW_ROWS)),
          totalRows,
          truncated: true,
          executionTime,
          warning:
            `Query returned ${totalRows}+ rows (hit limit). Only first ${PREVIEW_ROWS} shown. ` +
            "Rewrite with stricter WHERE filters or GROUP BY aggregations.",
        };
      }

      if (totalRows > FULL_DATA_THRESHOLD) {
        return {
          csv: rowsToCsv(rows.slice(0, PREVIEW_ROWS)),
          totalRows,
          executionTime,
          hint: `Showing ${PREVIEW_ROWS} of ${totalRows} rows. Use aggregations or narrower filters to reduce result set.`,
        };
      }

      return {
        csv: rowsToCsv(rows),
        totalRows,
        executionTime,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[ExecuteSQL] Error: ${message}`);
      return { error: message, csv: "", totalRows: 0 };
    }
  },
});
