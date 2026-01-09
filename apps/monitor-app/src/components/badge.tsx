import { cva, VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const badge = cva(["flex items-center w-fit gap-1.5 py-1 rounded-md font-medium"], {
  variants: {
    type: {
      success: ["text-status-good", "bg-status-good/10"],
      warning: ["text-status-needs-improvement bg-status-needs-improvement/10"],
      error: ["text-status-poor", "bg-status-poor/10"],
    },
    size: {
      sm: "text-xs px-2 py-1",
      md: "text-sm px-2.5 py-1.5",
      lg: "text-base px-3 py-2",
    },
  },
  defaultVariants: {
    type: "success",
    size: "sm",
  },
});

const icon = cva([], {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export type BadgeProps = VariantProps<typeof badge> & {
  label?: string;
  defaultIcon?: boolean;
  className?: string;
  LeftIcon?: React.ElementType;
  iconOnly?: boolean;
};
type BadgeType = NonNullable<BadgeProps["type"]>;

const defaultIcons: Partial<Record<BadgeType, React.ElementType>> = {
  error: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

export function Badge({
  type = "success",
  LeftIcon,
  size = "sm",
  defaultIcon,
  className,
  label,
  iconOnly,
}: BadgeProps) {
  const Icon = defaultIcons[type ?? "success"];
  const isIconOnly = !!iconOnly;
  const iconOnlyPadding = size === "sm" ? "p-1" : size === "md" ? "p-1.5" : "p-2";

  return (
    <div className={cn(badge({ type, size }), isIconOnly && ["rounded-full", "gap-0", iconOnlyPadding], className)}>
      {!!LeftIcon && <LeftIcon className={icon({ size })} />}
      {defaultIcon && !!Icon && <Icon className={icon({ size })} />}
      {!isIconOnly && label && <span>{label}</span>}
    </div>
  );
}
