import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
