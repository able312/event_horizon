import { resolveCartGrid } from "~/features/preview/components/cartPreviewUtils"
import {
  LETTER_HEIGHT_PX,
  LETTER_WIDTH_PX,
  PAGE_CONTENT_HEIGHT_PX,
  PAGE_CONTENT_WIDTH_PX,
  PAGE_MARGIN_PX,
} from "~/features/preview/pagination/packBlocksIntoPages"
import { useCartDetailsSection } from "~/hooks/useCartDetailsSection"
import { useEvent } from "~/hooks/useEvent"

type CartGrid = (number | string | null)[][]

function LargeCartDiagram({ grid }: { grid: CartGrid }) {
  const fontSize = Math.max(16, Math.min(36, Math.floor(280 / grid.length)))

  return (
    <div
      aria-label="Cart setup diagram"
      className="grid h-full w-full gap-3"
      style={{
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))`,
        fontSize,
      }}
    >
      {grid.flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div
            key={`cart-diagram-${rowIndex}-${columnIndex}`}
            className={
              cell === null || cell === undefined || cell === ""
                ? "min-h-0"
                : "flex min-h-0 items-center justify-center rounded-lg border-4 border-stone-800 bg-white font-bold text-stone-950"
            }
          >
            {cell ?? ""}
          </div>
        )),
      )}
    </div>
  )
}

export function CartDiagramPreview() {
  const { data: event } = useEvent()
  const { data: cartDetails, isLoading } = useCartDetailsSection()

  const content = (() => {
    if (event && event.type !== "tournament") {
      return (
        <p className="text-sm text-muted-foreground">
          The cart setup diagram is only available for tournament events.
        </p>
      )
    }

    if (isLoading || !cartDetails) {
      return <p className="text-sm text-muted-foreground">Loading cart setup diagram…</p>
    }

    return <LargeCartDiagram grid={resolveCartGrid(cartDetails.customGrid)} />
  })()

  return (
    <div
      className="preview-page mx-auto bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)] print:shadow-none"
      style={{
        width: LETTER_WIDTH_PX,
        height: LETTER_HEIGHT_PX,
        padding: PAGE_MARGIN_PX,
      }}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: PAGE_CONTENT_WIDTH_PX,
          height: PAGE_CONTENT_HEIGHT_PX,
        }}
      >
        {content}
      </div>
    </div>
  )
}
