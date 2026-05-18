import { CornerDownRight, Plus, Trash2 } from "lucide-react"

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

type WorkspaceItemBase = {
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

function computeTimeblockSubtotal<TItem extends WorkspaceItemBase>(items: TItem[]): number {
  return items.reduce((sum, item) => sum + computeBillableLineTotalCents(item), 0)
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
        <div className="rounded-xs border border-dashed border-border bg-muted/10 px-4 py-4">
          <p className="text-sm text-muted-foreground">{noTimeblocksCopy}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTimeblock}>
          <Plus />
          {addTimeblockLabel}
        </Button>
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
        const subtotalCents = computeTimeblockSubtotal(items)

        return (
          <section key={timeblock.id} className="rounded-xs border border-border bg-background">
            <div className="border-b border-border/70 bg-muted/15 px-3 pt-1 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-6 md:grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] items-center">
                  {/* Time */}
                  <label className="space-y-1 w-full flex justify-center items-center w-full">
                    <div className={`rounded-sm w-content text-white px-2 ${timeblock.time ? "bg-stone-600" : "bg-orange-500"}`}>
                      <input
                        type="time"
                        defaultValue={timeblock.time ?? ""}
                        onBlur={(e) => updateTimeblock({ id: timeblock.id, updates: { time: e.target.value } })}
                        aria-label={`${sectionTitle} time`}
                        className="h-7 bg-transparent text-sm font-bold outline-none w-full text-center"
                      />
                    </div>
                  </label>

                  {/* Title */}
                  <label className="space-y-1 border-r-1 border-stone-300 pr-6">
                    <input
                      type="text"
                      defaultValue={timeblock.title ?? ""}
                      onBlur={(e) => updateTimeblock({ id: timeblock.id, updates: { title: e.target.value } })}
                      placeholder={titlePlaceholder}
                      aria-label={`${sectionTitle} title`}
                      className="h-9 w-full rounded-xs border-b border-border bg-background px-2.5 text-md font-bold outline-none transition-colors focus:border-primary"
                    />
                  </label>
              
                  <label className="space-y-1 flex items-center">
                    <span className="text-[11px] font-medium uppercase text-muted-foreground w-1/2 m-0">Assigned To</span>
                    <input
                      type="text"
                      defaultValue={timeblock.assignedTo ?? ""}
                      onBlur={(e) => updateTimeblock({ id: timeblock.id, updates: { assignedTo: e.target.value } })}
                      placeholder="Assign to..."
                      aria-label="Assigned To"
                      className="h-9 w-full rounded-xs border-b border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTimeblock(timeblock.id)}
                  className="justify-start text-muted-foreground hover:text-destructive lg:justify-center"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="space-y-3 px-3 py-4">
                <div className="rounded-xs border border-dashed border-border bg-orange-50 px-3 py-4 text-sm text-muted-foreground">
                  {emptyItemsCopy}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem({ timeblockId: timeblock.id })}>
                    <Plus />
                    {addItemLabel}
                  </Button>
                  <p className="text-xs font-medium text-muted-foreground">Subtotal: {toCurrency(subtotalCents)}</p>
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
                          <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[104px] align-top text-right text-sm font-medium text-foreground`}>
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
                            <div className="flex items-center">
                            <CornerDownRight size={12} />
                            <textarea
                              defaultValue={item.includes ?? ""}
                              onBlur={(e) => updateItem({ timeblockId: timeblock.id, itemId: item.id, updates: patchItem("includes", e.target.value) })}
                              aria-label="Includes / Notes"
                              placeholder="Notes..."
                              rows={1}
                              className="min-h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground"
                            />
                            </div>
                          </td>
                        </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem({ timeblockId: timeblock.id })}>
                    <Plus />
                    {addItemLabel}
                  </Button>
                  <p className="text-xs font-medium text-muted-foreground">Subtotal: {toCurrency(subtotalCents)}</p>
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
