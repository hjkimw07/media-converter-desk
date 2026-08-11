import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium leading-4 transition-colors duration-150 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground",
        secondary: "border-border bg-card text-body",
        outline: "border-border bg-card text-body",
        warning: "border-transparent bg-warning-soft text-warning-deep",
        success: "border-transparent bg-link-soft text-link-deep",
        muted: "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
