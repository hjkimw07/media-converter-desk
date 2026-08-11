import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Switch({ checked, onCheckedChange, disabled, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "border-border bg-secondary",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-card shadow-whisper transition-transform duration-200 ease-out",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
