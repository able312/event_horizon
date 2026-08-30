import React from "react"
import { Trash2 } from "lucide-react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { UpdateTimeblock } from "~/definitions/database"
import { Button } from "~/components/atoms/button"
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
import PlanningTimeBlockHeader from "~/components/organisms/TimeblockHeader"
import { PlanningTimeblockItemNoteRow } from "./PlanningTimeblockItemNoteRow"
import FoodBevHeaderTail from "./FoodBevHeaderTail"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"

export interface PlanningWorkspaceTimeblockCardProps<TItem extends WorkspaceItemBase> {
  sectionTitle: string
  emptyItemsCopy: string
  addItemLabel: string
  titlePlaceholder: string
  serviceStyleOptions: string[]
  timeblock: TimeblockWithItems
  items: TItem[]
  overviewNotePlaceholder?: string
  showOverviewNote?: boolean
  headerTail?: React.ReactNode
  disabled?: boolean
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

function PlanningWorkspaceTimeblockCard<TItem extends WorkspaceItemBase>({
  sectionTitle,
  emptyItemsCopy,
  addItemLabel,
  titlePlaceholder,
  serviceStyleOptions,
  timeblock,
  items,
  overviewNotePlaceholder = "Overview notes for this timeblock…",
  showOverviewNote = true,
  headerTail,
  disabled = false,
  updateTimeblock,
  removeTimeblock,
  addItem,
  updateItem,
  removeItem,
}: PlanningWorkspaceTimeblockCardProps<TItem>) {
  const patchItem = (field: keyof WorkspaceItemBase, value: WorkspaceItemBase[keyof WorkspaceItemBase]) =>
    ({ [field]: value }) as Partial<TItem>

  const handleUpdateTimeblock = (payload: { id: string; updates: UpdateTimeblock }) => {
    if (disabled) return
    updateTimeblock(payload)
  }

  return (
    <section className="rounded-xs border border-border border-stone-200 bg-background shadow-sm mb-8">
      <PlanningTimeBlockHeader
        timeblockID={timeblock.id}
        title={timeblock.title ?? ""}
        titlePlaceholder={titlePlaceholder}
        sectionTitle={sectionTitle}
        time={timeblock.time ?? ""}
        assignedTo={timeblock.assignedTo ?? ""}
        tail={
          headerTail ?? (
            <FoodBevHeaderTail
              title={timeblock.title ?? "Untitled"}
              timeblockItems={items}
              addItemLabel={addItemLabel}
              disabled={disabled}
              deleteTimeblock={() => removeTimeblock(timeblock.id)}
              addItem={() => addItem({ timeblockId: timeblock.id })}
            />
          )
        }
        updateTimeblock={handleUpdateTimeblock}
      />

      {showOverviewNote ? (
        <div className="border-x border-stone-200 bg-white px-3 py-2">
          <label className="block">
            <span className="sr-only">Timeblock overview notes</span>
            <textarea
              key={`${timeblock.id}-details-${timeblock.updatedAt ?? "new"}`}
              defaultValue={timeblock.details ?? ""}
              disabled={disabled}
              onBlur={(e) =>
                handleUpdateTimeblock({
                  id: timeblock.id,
                  updates: { details: e.target.value },
                })
              }
              placeholder={overviewNotePlaceholder}
              aria-label="Timeblock overview notes"
              className="min-h-16 w-full rounded-xs border border-transparent bg-stone-50 px-2.5 py-2 text-sm text-stone-600 outline-none transition-colors field-sizing-content focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
            />
          </label>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="space-y-3 px-3 py-4">
          <div className="rounded-xs border border-dashed border-border bg-orange-50 px-3 py-4 text-sm text-muted-foreground">
            {emptyItemsCopy}
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-3 py-3 bg-stone-50 rounded-b-xs">
          <div className={SECTION_TABLE_CONTAINER_CLASS}>
            <table className={`${SECTION_TABLE_CLASS} min-w-[980px]`}>
              <thead>
                <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT + " pl-4"}>Item</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Service Style</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[220px] align-top`}>
                        <input
                          type="text"
                          defaultValue={item.name ?? ""}
                          disabled={disabled}
                          onBlur={(e) =>
                            updateItem({
                              timeblockId: timeblock.id,
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
                          defaultValue={item.serviceStyle ?? ""}
                          disabled={disabled}
                          onBlur={(e) =>
                            updateItem({
                              timeblockId: timeblock.id,
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
                          defaultValue={item.quantity ?? 0}
                          disabled={disabled}
                          onBlur={(e) =>
                            updateItem({
                              timeblockId: timeblock.id,
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
                          defaultValue={item.unitPriceCents ? centsToDollars(item.unitPriceCents).toFixed(2) : ""}
                          disabled={disabled}
                          onBlur={(e) =>
                            updateItem({
                              timeblockId: timeblock.id,
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
                          key={timeblock.id + "_" + item.id + "_notesRow"}
                          timeblockID={timeblock.id}
                          itemID={item.id}
                          note={item.includes ?? ""}
                          updateItem={updateItem}
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default PlanningWorkspaceTimeblockCard
