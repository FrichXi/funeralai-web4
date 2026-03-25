import { type VariantProps, cva } from "class-variance-authority";

export const tableVariants = cva("", {
  variants: {
    variant: {
      default: "p-4 py-2.5 border-y-6 border-foreground dark:border-ring",
      borderless: "",
    },
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
    variant: "default",
  },
});

export const tableContainerVariants = cva("relative flex", {
  variants: {
    layout: {
      intrinsic: "w-fit",
      fill: "w-full",
    },
    align: {
      start: "justify-start",
      center: "justify-center",
    },
  },
  defaultVariants: {
    layout: "intrinsic",
    align: "center",
  },
});

export type TableVariant = VariantProps<typeof tableVariants>["variant"];
export type TableFont = VariantProps<typeof tableVariants>["font"];
export type TableLayout = VariantProps<typeof tableContainerVariants>["layout"];
export type TableAlign = VariantProps<typeof tableContainerVariants>["align"];
