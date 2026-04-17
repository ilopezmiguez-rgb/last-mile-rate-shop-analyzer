"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Slider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[color:var(--color-surface-container-high)]">
      <SliderPrimitive.Range className="absolute h-full bg-[color:var(--color-primary-fixed)]" />
    </SliderPrimitive.Track>
    {Array.isArray(props.value ?? props.defaultValue)
      ? (props.value ?? props.defaultValue ?? []).map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className="block h-4 w-4 rounded-full bg-[color:var(--color-surface-bright)] shadow-[inset_0_0_0_2px_var(--color-primary-fixed)] ring-offset-2 transition-transform duration-100 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-fixed)]"
          />
        ))
      : (
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-[color:var(--color-surface-bright)] shadow-[inset_0_0_0_2px_var(--color-primary-fixed)] ring-offset-2 transition-transform duration-100 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-fixed)]" />
      )}
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
