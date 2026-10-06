import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle",
        "transition-colors duration-150",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
