import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-xs px-2 h-6 text-[0.6875rem] font-mono uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        neutral:
          "bg-[color:var(--color-surface-container-highest)] text-[color:var(--color-on-surface-muted)]",
        primary:
          "bg-[color:var(--color-primary-fixed)]/18 text-[color:var(--color-primary-fixed)]",
        success:
          "bg-[color:var(--color-success)]/14 text-[color:var(--color-success)]",
        danger:
          "bg-[color:var(--color-danger)]/16 text-[color:var(--color-danger)]",
        warning:
          "bg-[color:var(--color-warning)]/14 text-[color:var(--color-warning)]",
        gold: "bg-[color:var(--color-secondary)]/20 text-[color:var(--color-secondary)]",
        live: "bg-[color:var(--color-surface-container-high)] text-[color:var(--color-on-surface)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, className }))} {...props} />;
}
