"use client";

import type * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from "@/components/ui/tooltip";

import "@/components/ui/8bit/styles/retro.css";

export const tooltipVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitTooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof ShadcnTooltipContent>,
    VariantProps<typeof tooltipVariants> {}

function TooltipContent({
  className,
  children,
  font,
  ...props
}: BitTooltipContentProps) {
  const color = tooltipVariants({ font });

  return (
    <ShadcnTooltipContent
      {...props}
      data-slot="tooltip-content"
      className={cn("rounded-none", color, className)}
    >
      {children}
    </ShadcnTooltipContent>
  );
}

function Tooltip({ children, ...props }: React.ComponentPropsWithoutRef<typeof ShadcnTooltip>) {
  return (
    <ShadcnTooltip data-slot="tooltip" {...props}>
      {children}
    </ShadcnTooltip>
  );
}

function TooltipProvider({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof ShadcnTooltipProvider>) {
  return (
    <ShadcnTooltipProvider {...props}>
      {children}
    </ShadcnTooltipProvider>
  );
}

function TooltipTrigger({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof ShadcnTooltipTrigger>) {
  return (
    <ShadcnTooltipTrigger
      data-slot="tooltip-trigger"
      {...props}
    >
      {children}
    </ShadcnTooltipTrigger>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
