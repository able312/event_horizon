import * as React from "react"

import { cn } from "~/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  [
    // Core layout and shape
    "flex w-full min-w-0 rounded-md",

    // Base visual styling
    "bg-transparent px-3 py-1 text-base shadow-xs outline-none",
    "transition-[color,box-shadow] dark:bg-input/30",
    "placeholder:text-muted-foreground",
    "selection:bg-primary selection:text-primary-foreground",

    // Input-type-specific styling
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent",
    "file:text-sm file:font-medium file:text-foreground",

    // Interactive and responsive states
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-orange-500 focus-visible:ring-[2px]",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:aria-invalid:ring-destructive/40",
    "md:text-sm field-sizing-content",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-1 border-stone-300",
        ghost: 
          "bg-transparent px-1.5 py-1 rounded-sm text-md font-bold outline-none transition-colors focus:border-orange-500 focus:bg-stone-600 group-hover:bg-stone-600 hover:ring hover:ring-stone-300",
        darkSecondary:
          "px-1.5 py-0.5 placeholder:text-white/50 rounded-sm text-sm text-white border-1 border-stone-600 shadow sm outline-none transition-colors bg-stone-700 hover:border-stone-300"
      }
    }
  }
)

function Input({ className, type, variant="default", ...props }: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>) {

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Input }
