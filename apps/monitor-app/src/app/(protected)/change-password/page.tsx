import { ChangePasswordForm } from "@/components/change-password-form";
import { getAuthorizedSession, getSafeCallbackUrl } from "@/lib/auth-utils";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getAuthorizedSession();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <ChangePasswordForm callbackUrl={callbackUrl} />
    </div>
  );
}
