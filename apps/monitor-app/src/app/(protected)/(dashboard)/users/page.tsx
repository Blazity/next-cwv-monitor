import { getAuthorizedSession } from "@/lib/auth-utils";

async function UsersPage() {
  await getAuthorizedSession();
  return <div>UsersPage</div>;
}

export default UsersPage;
