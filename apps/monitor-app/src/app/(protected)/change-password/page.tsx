import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { auth } from "@/lib/auth";
import { getAuthorizedSession, getSafeCallbackUrl } from "@/lib/auth-utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function ChangePasswordContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getAuthorizedSession();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/login?callbackUrl=/change-password?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!session.user.isPasswordTemporary) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <ChangePasswordForm callbackUrl={callbackUrl} />
    </div>
  );
}

export default function ChangePasswordPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ChangePasswordContent {...props} />
    </Suspense>
  );
}
