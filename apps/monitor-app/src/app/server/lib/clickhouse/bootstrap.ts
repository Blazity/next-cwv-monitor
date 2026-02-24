import { sql } from "@/app/server/lib/clickhouse/client";
import { env } from "@/env";

export async function syncDatabaseRoles() {
  const aiUser = env.AI_ANALYST_CLICKHOUSE_USER;
  const aiPass = env.AI_ANALYST_CLICKHOUSE_PASSWORD;

  if (!aiUser || !aiPass) return;
    await sql`
      ALTER USER ${sql.identifier(aiUser)} IDENTIFIED WITH sha256_password BY ${aiPass}
    `.command();
}