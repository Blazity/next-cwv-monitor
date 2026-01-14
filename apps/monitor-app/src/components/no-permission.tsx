import type { ComponentProps } from "react";
import Link from "next/link";
import { Home, LayoutDashboard, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type LinkHref = ComponentProps<typeof Link>["href"];

type Props = {
  title?: string;
  description?: string;
  primaryActionHref?: LinkHref;
  primaryActionLabel?: string;
  secondaryActionHref?: LinkHref;
  secondaryActionLabel?: string;
};

export function NoPermission({
  title = "Access denied",
  description = "You don't have permission to view this page.",
  primaryActionHref = "/projects",
  primaryActionLabel = "Back to projects",
  secondaryActionHref = "/",
  secondaryActionLabel = "Home",
}: Props) {
  return (
    <div className="bg-background flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-4">
            <ShieldOff className="text-muted-foreground h-12 w-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href={secondaryActionHref}>
              <Home className="mr-2 h-4 w-4" />
              {secondaryActionLabel}
            </Link>
          </Button>
          <Button asChild>
            <Link href={primaryActionHref}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {primaryActionLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
