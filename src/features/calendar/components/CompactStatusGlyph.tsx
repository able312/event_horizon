import { Check, X } from "lucide-react"
import { cn } from "~/lib/utils"
import type { CompactGlyphShape } from "./compactEventStatus"

type CompactStatusGlyphProps = {
  shape: CompactGlyphShape
  className: string
}

/** 9px status glyph for compact calendar lines. Decorative: the line's accessible name carries the status. */
function CompactStatusGlyph({ shape, className }: CompactStatusGlyphProps) {
  return (
    <span
      className="flex size-[9px] shrink-0 items-center justify-center"
      aria-hidden="true"
      data-glyph={shape}
    >
      {shape === "diamond" ? <span className={cn("size-2 rotate-45 rounded-[1px]", className)} /> : null}
      {shape === "dashed-ring" ? (
        <span className={cn("size-[9px] rounded-full border-[1.5px] border-dashed", className)} />
      ) : null}
      {shape === "dot" ? <span className={cn("size-[9px] rounded-full", className)} /> : null}
      {shape === "check" ? (
        <Check className={cn("size-[9px]", className)} strokeWidth={2} absoluteStrokeWidth />
      ) : null}
      {shape === "cross" ? <X className={cn("size-[9px]", className)} strokeWidth={2} absoluteStrokeWidth /> : null}
    </span>
  )
}

export default CompactStatusGlyph
