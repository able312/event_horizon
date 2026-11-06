import { cn } from "~/lib/utils"

/** A food item's kitchen-only note, marked so it reads apart from the client note. */
export function KitchenNote({ note, className }: { note: string; className?: string }) {
  return (
    <div className={cn("mt-1 border-l-2 border-stone-400 pl-2 text-xs text-stone-700", className)}>
      <span className="font-semibold uppercase tracking-wide text-[10px] text-stone-500">Kitchen: </span>
      <span className="whitespace-pre-wrap font-sans">{note}</span>
    </div>
  )
}
