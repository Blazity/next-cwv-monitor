import { getAuthorizedSession } from "@/lib/auth-utils";

async function RegressionsPage() {
  await getAuthorizedSession();
  return <div>RegressionsPage</div>;
}

export default RegressionsPage;
