import { cn } from "@/lib/utils";

export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("text-primary", className)} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.08" />
      <rect x="8" y="12" width="32" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 16h32" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="26" r="1.6" fill="currentColor" />
      <circle cx="22" cy="26" r="1.6" fill="currentColor" />
      <circle cx="16" cy="32" r="1.6" fill="currentColor" />
      <circle cx="22" cy="32" r="1.6" fill="currentColor" />
      <circle cx="28" cy="26" r="1.6" fill="currentColor" />
      <circle cx="34" cy="32" r="1.6" fill="currentColor" />
    </svg>
  );
}
