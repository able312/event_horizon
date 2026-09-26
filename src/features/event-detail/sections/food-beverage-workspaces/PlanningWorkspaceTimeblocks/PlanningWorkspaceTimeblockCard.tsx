import React from "react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { UpdateTimeblock } from "~/definitions/database"
import {
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import PlanningTimeBlockHeader from "~/components/organisms/TimeblockHeader"
import FoodBevHeaderTail from "./FoodBevHeaderTail"
import PlanningTimeblockItemRow from "./PlanningTimeblockItemRow"
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
                  <PlanningTimeblockItemRow
                    key={item.id}
                    timeblockId={timeblock.id}
                    item={item}
                    serviceStyleOptions={serviceStyleOptions}
                    disabled={disabled}
                    updateItem={updateItem}
                    removeItem={removeItem}
                  />
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
