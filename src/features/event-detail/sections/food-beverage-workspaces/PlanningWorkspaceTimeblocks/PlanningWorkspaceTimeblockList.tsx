import { Plus } from "lucide-react"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { UpdateTimeblock } from "~/definitions/database"
import { Button } from "~/components/atoms/button"
import PlanningWorkspaceTimeblockCard from "./PlanningWorkspaceTimeblockCard"

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

      {timeblocks.map((timeblock) => (
        <PlanningWorkspaceTimeblockCard
          key={timeblock.id}
          sectionTitle={sectionTitle}
          emptyItemsCopy={emptyItemsCopy}
          addItemLabel={addItemLabel}
          titlePlaceholder={titlePlaceholder}
          serviceStyleOptions={serviceStyleOptions}
          timeblock={timeblock}
          items={getItems(timeblock)}
          updateTimeblock={updateTimeblock}
          removeTimeblock={removeTimeblock}
          addItem={addItem}
          updateItem={updateItem}
          removeItem={removeItem}
        />
      ))}
    </div>
  )
}

export default PlanningWorkspaceTimeblockList
