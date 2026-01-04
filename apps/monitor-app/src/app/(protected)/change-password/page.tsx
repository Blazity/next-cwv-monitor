import { ChangePasswordForm } from "@/components/change-password-form";
import { getAuthorizedSession, getSafeCallbackUrl } from "@/lib/auth-utils";

async function ChangePasswordContent({
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

export default function ChangePasswordPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <ChangePasswordContent {...props} />;
}
