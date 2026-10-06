import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warn" | "danger" | "muted" }) {
  const tones = {
    default: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    muted: "bg-bg-elevated text-muted",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
