import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import {
  centsToDollars,
  computeBillableLineTotalCents,
  dollarsToCents,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import { PlanningTimeblockItemNoteRow } from "./PlanningTimeblockItemNoteRow"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"

function parseQuantity(value: string): number {
  return Math.max(0, Number(value) || 0)
}

function parsePrice(value: string): number {
  return Math.max(0, dollarsToCents(value))
}

function formatUnitPrice(unitPriceCents: number | null): string {
  return unitPriceCents ? centsToDollars(unitPriceCents).toFixed(2) : ""
}

export interface PlanningTimeblockItemRowProps<TItem extends WorkspaceItemBase> {
  timeblockId: string
  item: TItem
  serviceStyleOptions: string[]
  disabled?: boolean
  updateItem: (payload: { timeblockId: string; itemId: string; updates: Partial<TItem> }) => void
  removeItem: (payload: { timeblockId: string; itemId: string }) => void
}

function PlanningTimeblockItemRow<TItem extends WorkspaceItemBase>({
  timeblockId,
  item,
  serviceStyleOptions,
  disabled = false,
  updateItem,
  removeItem,
}: PlanningTimeblockItemRowProps<TItem>) {
  const [name, setName] = useState(item.name ?? "")
  const [serviceStyle, setServiceStyle] = useState(item.serviceStyle ?? "")
  const [quantity, setQuantity] = useState(String(item.quantity ?? 0))
  const [unitPrice, setUnitPrice] = useState(formatUnitPrice(item.unitPriceCents))

  useEffect(() => {
    setName(item.name ?? "")
  }, [item.name])

  useEffect(() => {
    setServiceStyle(item.serviceStyle ?? "")
  }, [item.serviceStyle])

  useEffect(() => {
    setQuantity(String(item.quantity ?? 0))
  }, [item.quantity])

  useEffect(() => {
    setUnitPrice(formatUnitPrice(item.unitPriceCents))
  }, [item.unitPriceCents])

  const patchItem = (field: keyof WorkspaceItemBase, value: WorkspaceItemBase[keyof WorkspaceItemBase]) =>
    ({ [field]: value }) as Partial<TItem>

  return (
    <>
      <tr>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[220px] align-top`}>
          <input
            type="text"
            value={name}
            disabled={disabled}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) =>
              updateItem({
                timeblockId,
                itemId: item.id,
                updates: patchItem("name", e.target.value),
              })
            }
            aria-label="Item Name"
            placeholder="Untitled item"
            className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm font-medium outline-none transition-colors focus:border-border focus:bg-background disabled:opacity-60"
          />
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[170px] align-top`}>
          <select
            value={serviceStyle}
            disabled={disabled}
            onChange={(e) => setServiceStyle(e.target.value)}
            onBlur={(e) =>
              updateItem({
                timeblockId,
                itemId: item.id,
                updates: patchItem("serviceStyle", e.target.value),
              })
            }
            aria-label="Service Style"
            className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
          >
            <option value="">Select...</option>
            {serviceStyleOptions.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[84px] align-top text-right`}>
          <input
            type="number"
            min="0"
            value={quantity}
            disabled={disabled}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={(e) =>
              updateItem({
                timeblockId,
                itemId: item.id,
                updates: patchItem("quantity", parseQuantity(e.target.value)),
              })
            }
            aria-label="Quantity"
            className="ml-auto h-8 w-16 rounded-xs border border-transparent bg-transparent px-1.5 text-right text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
          />
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[112px] align-top text-right`}>
          <input
            type="text"
            inputMode="decimal"
            value={unitPrice}
            disabled={disabled}
            onChange={(e) => setUnitPrice(e.target.value)}
            onBlur={(e) =>
              updateItem({
                timeblockId,
                itemId: item.id,
                updates: patchItem("unitPriceCents", parsePrice(e.target.value)),
              })
            }
            aria-label="Unit Price"
            placeholder="0.00"
            className="ml-auto h-8 w-20 rounded-xs border border-transparent bg-transparent px-1.5 text-right text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
          />
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[104px] align-center text-right text-sm font-medium text-foreground`}>
          {toCurrency(computeBillableLineTotalCents(item))}
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[72px] align-top text-right`}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => removeItem({ timeblockId, itemId: item.id })}
            aria-label="Remove Item"
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </td>
      </tr>
      <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
        <td colSpan={6} className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[240px] align-top`}>
          <PlanningTimeblockItemNoteRow
            timeblockID={timeblockId}
            itemID={item.id}
            note={item.includes ?? ""}
            updateItem={updateItem}
          />
        </td>
      </tr>
    </>
  )
}

export default PlanningTimeblockItemRow
