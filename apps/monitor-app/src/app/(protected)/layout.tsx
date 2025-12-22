import { SessionProvider } from "@/contexts/session-provider";
import { getServerSessionDataOrRedirect } from "@/lib/get-server-session-data-or-redirect";
import { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const sessionData = await getServerSessionDataOrRedirect();

  return <SessionProvider initialSessionData={sessionData}>{children}</SessionProvider>;
}
