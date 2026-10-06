import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-[var(--motion-fast)] disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:bg-ink",
        outline: "border border-border bg-surface text-fg hover:bg-primary-soft",
        ghost: "text-fg hover:bg-primary-soft",
        danger: "bg-danger text-primary-fg hover:opacity-90",
        subtle: "bg-primary-soft text-primary hover:bg-border",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3 text-xs",
        lg: "h-12 px-5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
