import { syncDatabaseRoles } from "@/app/server/lib/clickhouse/bootstrap";
import { provisionInitialUser } from "@/lib/provision-initial-user";

export async function register() {
  await provisionInitialUser();
  await syncDatabaseRoles();
}
