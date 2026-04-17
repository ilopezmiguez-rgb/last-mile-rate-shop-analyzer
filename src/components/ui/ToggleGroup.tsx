"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const ToggleGroup = forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 p-1 rounded-sm bg-[color:var(--color-surface-container-low)] ghost-border",
      className
    )}
    {...props}
  />
));
ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-xs",
      "text-[color:var(--color-on-surface-muted)] transition-colors",
      "hover:text-[color:var(--color-on-surface)]",
      "data-[state=on]:bg-[color:var(--color-surface-container-high)] data-[state=on]:text-[color:var(--color-on-surface)]",
      className
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = "ToggleGroupItem";
