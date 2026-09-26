import { cn } from "~/lib/utils"

type SegmentedControlProps<T extends string> = {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  "aria-label": string
}

/** Small radio-style button group, matching the bordered button groups used in the touchpoints card. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex overflow-hidden rounded-xs border border-border">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "h-8 border-r border-border px-3 text-sm transition-colors last:border-r-0",
              selected ? "bg-stone-800 text-white" : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
