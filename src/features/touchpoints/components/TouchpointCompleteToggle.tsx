import { Check } from "lucide-react"

import { cn } from "~/lib/utils"

const COMPLETE_TOGGLE_CLASS =
  "group/complete inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/35 bg-transparent text-orange-500 transition-colors hover:border-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:pointer-events-none disabled:opacity-50"

type TouchpointCompleteToggleProps = {
  checked: boolean
  disabled?: boolean
  className?: string
  "aria-label": string
  onToggle: () => void
}

/** Shared circle checkbox used to mark a touchpoint complete (or reopen). */
export function TouchpointCompleteToggle({
  checked,
  disabled,
  className,
  "aria-label": ariaLabel,
  onToggle,
}: TouchpointCompleteToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(COMPLETE_TOGGLE_CLASS, className)}
      aria-label={ariaLabel}
      aria-checked={checked}
      role="checkbox"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <Check
        className={cn(
          "size-3 stroke-[3] transition-opacity",
          checked
            ? "opacity-100"
            : "opacity-0 text-muted-foreground group-hover/complete:opacity-40",
        )}
        aria-hidden
      />
    </button>
  )
}
