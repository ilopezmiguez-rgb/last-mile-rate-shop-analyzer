"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-sm transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "cta-primary text-[color:var(--color-on-primary)] hover:brightness-110 active:brightness-95",
        secondary:
          "bg-[color:var(--color-surface-container-highest)] text-[color:var(--color-on-surface)] hover:bg-[color:var(--color-surface-bright)] ghost-border",
        tertiary:
          "bg-transparent text-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-container)]",
        ghost:
          "bg-transparent text-[color:var(--color-on-surface-muted)] hover:text-[color:var(--color-on-surface)] hover:bg-[color:var(--color-surface-container)]",
        danger:
          "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/20",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 text-sm [&_svg]:size-4",
        lg: "h-10 px-5 text-sm [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonStyles({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonStyles };
