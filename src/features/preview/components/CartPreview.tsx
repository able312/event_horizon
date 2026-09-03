import React from "react"

import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"
import {
  CART_KEYS_WARNING,
  countRequiredCarts,
  resolveCartGrid,
} from "./cartPreviewUtils"

type CartPreviewProps = {
  time?: string | null
  assignedTo?: string | null
  whatGoesOnCarts?: string | null
  customGrid?: (number | string | null)[][] | null
  /** When false, omit setup time / assigned metadata (timeline already shows them on the row). */
  showSetupMetadata?: boolean
}

export function CartPreview({
  time,
  assignedTo,
  whatGoesOnCarts,
  customGrid,
  showSetupMetadata = true,
}: CartPreviewProps) {
  const grid = resolveCartGrid(customGrid)
  const cartCount = countRequiredCarts(grid)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        {showSetupMetadata ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {time ? (
              <>
                <dt className="text-muted-foreground">Setup time</dt>
                <dd className="font-medium">{time}</dd>
              </>
            ) : null}
            {assignedTo ? (
              <>
                <dt className="text-muted-foreground">Assigned to</dt>
                <dd className="font-medium">{assignedTo}</dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {whatGoesOnCarts?.trim() ? (
          <div className={`text-sm ${showSetupMetadata ? "mt-3 border-t pt-3" : ""}`}>
            <p className="mb-1 text-muted-foreground">Goes on carts</p>
            <PreviewMarkdownContent source={whatGoesOnCarts} />
          </div>
        ) : null}

        <p className="pt-4 text-sm text-stone-500">Requires {cartCount} carts.</p>

        <div className="mt-4 break-inside-avoid border-l-4 border-yellow-400 bg-yellow-50 p-3">
          <p className="text-xs font-semibold text-yellow-800">{CART_KEYS_WARNING}</p>
        </div>
      </div>

      <div className="break-inside-avoid">
        <CartDiagram grid={grid} />
      </div>
    </div>
  )
}

export function CartDiagram({
  grid,
  compact = false,
}: {
  grid: (number | string | null)[][]
  compact?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[10%_20%_10%_20%_10%_10%] items-center justify-end gap-1 text-sm ${
        compact ? "" : "my-1"
      }`}
    >
      {grid.map((row, ri) => (
        <React.Fragment key={`cart_row_${ri}`}>
          {row.map((cell, ci) => (
            <div
              key={`cart_cell_${ri}_${ci}`}
              className={`${compact ? "h-8 w-8" : "h-5 w-5"} ${
                cell ? "flex items-center justify-center border" : ""
              } ${ci === 2 || ci === 4 ? "mr-6" : "mr-2"}`}
            >
              {cell ? (cell === "Lead" ? "L" : cell) : ""}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
