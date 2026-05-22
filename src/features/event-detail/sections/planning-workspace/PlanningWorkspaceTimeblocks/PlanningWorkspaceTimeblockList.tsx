import { Plus, Trash2 } from "lucide-react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { UpdateTimeblock } from "~/definitions/database"
import { Button } from "~/components/ui/button"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import {
  centsToDollars,
  computeBillableLineTotalCents,
  dollarsToCents,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import PlanningTimeBlockHeader from "./PlanningTimeblockHeader"
import { PlanningTimeblockItemNoteRow } from "./PlanningTimeblockItemNoteRow"

export type WorkspaceItemBase = {
  id: string
  name: string
  quantity: number | null
  serviceStyle: string | null
  includes: string | null
  unitPriceCents: number | null
}

interface PlanningWorkspaceTimeblockListProps<TItem extends WorkspaceItemBase> {
  sectionTitle: string
  noTimeblocksCopy: string
  emptyItemsCopy: string
  addTimeblockLabel: string
  addItemLabel: string
  titlePlaceholder: string
  serviceStyleOptions: string[]
  timeblocks: TimeblockWithItems[]
  isLoading?: boolean
  getItems: (timeblock: TimeblockWithItems) => TItem[]
  addTimeblock: () => void
  updateTimeblock: (payload: { id: string; updates: UpdateTimeblock }) => void
  removeTimeblock: (id: string) => void
  addItem: (payload: { timeblockId: string }) => void
  updateItem: (payload: { timeblockId: string; itemId: string; updates: Partial<TItem> }) => void
  removeItem: (payload: { timeblockId: string; itemId: string }) => void
}

function parseQuantity(value: string): number {
  return Math.max(0, Number(value) || 0)
}

function parsePrice(value: string): number {
  return Math.max(0, dollarsToCents(value))
}

function PlanningWorkspaceTimeblockList<TItem extends WorkspaceItemBase>({
  sectionTitle,
  noTimeblocksCopy,
  emptyItemsCopy,
  addTimeblockLabel,
  addItemLabel,
  titlePlaceholder,
  serviceStyleOptions,
  timeblocks,
  isLoading = false,
  getItems,
  addTimeblock,
  updateTimeblock,
  removeTimeblock,
  addItem,
  updateItem,
  removeItem,
}: PlanningWorkspaceTimeblockListProps<TItem>) {
  const patchItem = (field: keyof WorkspaceItemBase, value: WorkspaceItemBase[keyof WorkspaceItemBase]) =>
    ({ [field]: value }) as Partial<TItem>

  if (isLoading) {
    return <div className="w-full text-sm text-muted-foreground">Loading...</div>
  }

  if (timeblocks.length === 0) {
    return (
      <div className="space-y-3">
         <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">{sectionTitle}</h3>
          <p className="text-xs text-muted-foreground">Grouped by timeblock with inline planning and pricing edits.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTimeblock}>
          <Plus />
          {addTimeblockLabel}
        </Button>
      </div>
        <div className="rounded-xs border border-dashed border-border bg-orange-50 px-4 py-4">
          <p className="text-sm text-muted-foreground">{noTimeblocksCopy}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">{sectionTitle}</h3>
          <p className="text-xs text-muted-foreground">Grouped by timeblock with inline planning and pricing edits.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTimeblock}>
          <Plus />
          {addTimeblockLabel}
        </Button>
      </div>

      {timeblocks.map((timeblock) => {
        const items = getItems(timeblock)

        return (
          <section key={timeblock.id} className="rounded-xs border border-border border-stone-200 bg-background shadow-sm">

            <PlanningTimeBlockHeader 
              timeblockID = { timeblock.id }
              title={ timeblock.title ?? "" }
              titlePlaceholder={ titlePlaceholder }
              sectionTitle={ sectionTitle }
              time={ timeblock.time ?? "" }
              assignedTo={ timeblock.assignedTo ?? ""}
              addItemLabel={ addItemLabel }
              updateTimeblock={ updateTimeblock }
              removeTimeblock={ removeTimeblock }
              addItem={ addItem }
            />

            {items.length === 0 ? (
              <div className="space-y-3 px-3 py-4">
                <div className="rounded-xs border border-dashed border-border bg-orange-50 px-3 py-4 text-sm text-muted-foreground">
                  {emptyItemsCopy}
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-3 py-3">
                <div className={SECTION_TABLE_CONTAINER_CLASS}>
                  <table className={`${SECTION_TABLE_CLASS} min-w-[980px]`}>
                    <thead>
                      <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Service Style</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <>
                        <tr key={item.id}>
                          <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[220px] align-top`}>
                            <input
                              type="text"
                              defaultValue={item.name ?? ""}
                              onBlur={(e) => updateItem({ timeblockId: timeblock.id, itemId: item.id, updates: patchItem("name", e.target.value) })}
                              aria-label="Item Name"
                              placeholder="Untitled item"
                              className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm font-medium outline-none transition-colors focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[170px] align-top`}>
                            <select
                              defaultValue={item.serviceStyle ?? ""}
                              onBlur={(e) => updateItem({ timeblockId: timeblock.id, itemId: item.id, updates: patchItem("serviceStyle", e.target.value) })}
                              aria-label="Service Style"
                              className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground"
                            >
                              <option value="">Select...</option>
                              {serviceStyleOptions.map((style) => (
                                <option key={style} value={style}>{style}</option>
                              ))}
                            </select>
                          </td>
                          <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[84px] align-top text-right`}>
                            <input
                              type="number"
                              min="0"
                              defaultValue={item.quantity ?? 0}
                              onBlur={(e) => updateItem({
                                timeblockId: timeblock.id,
                                itemId: item.id,
                                updates: patchItem("quantity", parseQuantity(e.target.value)),
                              })}
                              aria-label="Quantity"
                              className="ml-auto h-8 w-16 rounded-xs border border-transparent bg-transparent px-1.5 text-right text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground"
                            />
                          </td>
                          <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[112px] align-top text-right`}>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={item.unitPriceCents ? centsToDollars(item.unitPriceCents).toFixed(2) : ""}
                              onBlur={(e) => updateItem({
                                timeblockId: timeblock.id,
                                itemId: item.id,
                                updates: patchItem("unitPriceCents", parsePrice(e.target.value)),
                              })}
                              aria-label="Unit Price"
                              placeholder="0.00"
                              className="ml-auto h-8 w-20 rounded-xs border border-transparent bg-transparent px-1.5 text-right text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground"
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
                              onClick={() => removeItem({ timeblockId: timeblock.id, itemId: item.id })}
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
                              timeblockID={ timeblock.id }
                              itemID={ item.id }
                              note={ item.includes ?? "" }
                              updateItem={ updateItem }
                            />
                          </td>
                        </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )
      })}

    </div>
  )
}

export default PlanningWorkspaceTimeblockList
