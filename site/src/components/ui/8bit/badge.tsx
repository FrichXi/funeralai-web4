import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { Badge as ShadcnBadge } from "@/components/ui/badge";

export const badgeVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
    variant: {
      default: "border-primary bg-primary",
      destructive: "border-destructive bg-destructive",
      outline: "border-background bg-background",
      secondary: "border-secondary bg-secondary",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function isVisualClass(className: string) {
  const baseClass = className.includes(':') ? className.slice(className.lastIndexOf(':') + 1) : className;
  return (
    baseClass.startsWith("bg-") ||
    baseClass.startsWith("border-") ||
    baseClass.startsWith("text-") ||
    baseClass.startsWith("rounded-")
  );
}

function Badge({
  children,
  className = "",
  font,
  variant,
  ...props
}: BitButtonProps) {
  const color = badgeVariants({ variant, font });

  const classes = className.split(" ");

  // visual classes for badge and sidebars
  const visualClasses = classes.filter((c) => isVisualClass(c));

  // Container should accept all non-visual utility classes (e.g., size, spacing, layout)
  const containerClasses = classes.filter((c) => !isVisualClass(c));

  return (
    <div className={cn("relative inline-flex items-stretch", containerClasses)}>
      <ShadcnBadge
        {...props}
        className={cn(
          "h-full",
          "rounded-none",
          "w-full",
          font !== "normal" && "retro",
          visualClasses
        )}
        variant={variant}
      >
        {children}
      </ShadcnBadge>

      {/* Left pixel bar */}
      <div
        className={cn(
          "-left-1.5 absolute inset-y-[4px] w-1.5",
          color,
          visualClasses
        )}
      />
      {/* Right pixel bar */}
      <div
        className={cn(
          "-right-1.5 absolute inset-y-[4px] w-1.5",
          color,
          visualClasses
        )}
      />
    </div>
  );
}

export { Badge };
