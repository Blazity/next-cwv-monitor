import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAuthorizedSession() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });

  if (!sessionData?.session) {
    throw new Error("Unauthorized");
  }

  return {
    session: sessionData.session,
    user: sessionData.user
  };
}
