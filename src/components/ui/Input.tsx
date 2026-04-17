import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-sm bg-[color:var(--color-surface-container-low)] px-3 text-sm",
      "text-[color:var(--color-on-surface)] placeholder:text-[color:var(--color-on-surface-dim)]",
      "ghost-border focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--color-primary-fixed)]",
      "transition-shadow duration-100",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
