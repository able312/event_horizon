import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import type { BeverageItemType, Timeblock, UpdateTimeblock } from "~/definitions/database"
import type { BeverageItemWithAssignments } from "~/definitions/beverage/beverage-types"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import TimeBlockHeader from "~/components/organisms/TimeblockHeader"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import { getVisibleBeverageTypeSections } from "./beverage/beverageTypeSections"
import { BeverageTimeblockHeaderTail } from "./beverage/BeverageTimeblockHeaderTail"
import { BeverageTimeblockNoteRow } from "./beverage/BeverageTimeblockNoteRow"

function parseQuantity(value: string): number {
  return Math.max(0, Number(value) || 0)
}

function queryBeverageItemNameInput(itemId: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(
    `[data-beverage-item-id="${itemId}"] [data-cell="item"]`,
  )
}

function focusBeverageItemNameInput(itemId: string): void {
  const nameInput = queryBeverageItemNameInput(itemId)
  if (!nameInput || document.activeElement === nameInput) return
  nameInput.focus()
}

const BeverageWorkspaceSection: React.FC = () => {
  const {
    timeblocks,
    items,
    isLoading,
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem,
    updateItem,
    removeItem,
    setItemTimeblocks,
  } = useBeverageSection()

  const [lastChosenType, setLastChosenType] = useState<BeverageItemType>("Beer")
  const pendingFocusItemIdRef = useRef<string | null>(null)

  const typeSections = useMemo(
    () => getVisibleBeverageTypeSections(items, { hideEmptySpecialOrders: true }),
    [items],
  )

  useLayoutEffect(() => {
    const pendingId = pendingFocusItemIdRef.current
    if (!pendingId) return
    focusBeverageItemNameInput(pendingId)
  }, [items])

  useEffect(() => {
    const clearPendingIfUserLeftNameInput = (event: FocusEvent) => {
      const pendingId = pendingFocusItemIdRef.current
      if (!pendingId) return

      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target === document.body || target === document.documentElement) return

      const nameInput = queryBeverageItemNameInput(pendingId)
      if (nameInput && target !== nameInput) {
        pendingFocusItemIdRef.current = null
      }
    }

    document.addEventListener("focusin", clearPendingIfUserLeftNameInput)
    return () => document.removeEventListener("focusin", clearPendingIfUserLeftNameInput)
  }, [])

  const queuePendingNameFocus = () => {
    requestAnimationFrame(() => {
      const pendingId = pendingFocusItemIdRef.current
      if (!pendingId) return
      focusBeverageItemNameInput(pendingId)

      requestAnimationFrame(() => {
        const stillPendingId = pendingFocusItemIdRef.current
        if (!stillPendingId) return
        focusBeverageItemNameInput(stillPendingId)
      })
    })
  }

  const handlePrimaryAdd = () => {
    const id = crypto.randomUUID()
    pendingFocusItemIdRef.current = id
    addItem({ id, type: lastChosenType, newItem: { name: "" } })
    queuePendingNameFocus()
  }

  const handleTypeAdd = (type: BeverageItemType) => {
    const id = crypto.randomUUID()
    setLastChosenType(type)
    pendingFocusItemIdRef.current = id
    addItem({ id, type, newItem: { name: "" } })
    queuePendingNameFocus()
  }

  const toggleTimeblockAssignment = (item: BeverageItemWithAssignments, timeblockId: string, checked: boolean) => {
    const nextIds = checked
      ? [...item.assignedTimeblockIds, timeblockId]
      : item.assignedTimeblockIds.filter((id) => id !== timeblockId)

    setItemTimeblocks({ itemId: item.id, timeblockIds: nextIds })
  }

  if (isLoading) {
    return <div className="w-full text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">Beverage Planning</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-xs border border-border bg-background p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-sm font-semibold tracking-wide">Drinks</h4>
            <div className="inline-flex items-center">
              <button
                type="button"
                onClick={handlePrimaryAdd}
                className="inline-flex items-center gap-1 rounded-l-xs border border-r-0 border-orange-200 bg-orange-100 px-2 text-sm text-orange-700 hover:bg-orange-50"
              >
                <Plus size={14} />
                Add Item
              </button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Choose beverage type"
                    className="inline-flex h-full min-h-[22px] items-center rounded-r-xs border border-orange-200 bg-orange-100 px-2 text-orange-700 hover:bg-orange-50"
                  >
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  {ITER_BEVERAGE_TYPE.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => handleTypeAdd(type)}>
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-4">
            {typeSections.map((section) => (
              <div key={section.type} className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.type}</h5>
                <div className={SECTION_TABLE_CONTAINER_CLASS}>
                  <table className={`${SECTION_TABLE_CLASS} table-fixed`}>
                    <colgroup>
                      <col />
                      <col className="w-16" />
                      <col className="w-44" />
                      <col className="w-20" />
                    </colgroup>
                    <thead>
                      <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Item</th>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Qty</th>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Timeblocks</th>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.length === 0 ? (
                        <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
                          <td colSpan={4} className="px-1.5 py-3 text-xs text-muted-foreground">
                            No {section.type.toLowerCase()} items yet.
                          </td>
                        </tr>
                      ) : (
                        section.items.map((item) => (
                          <tr key={item.id} className={SECTION_TABLE_BODY_ROW_CLASS} data-beverage-item-id={item.id}>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0 align-top`}>
                              <input
                                data-cell="item"
                                type="text"
                                defaultValue={item.name}
                                placeholder="Item name"
                                onBlur={(e) => updateItem({ itemId: item.id, updates: { name: e.target.value } })}
                                aria-label="Beverage item name"
                                className="h-7 w-full min-w-0 truncate border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"
                              />
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top text-right`}>
                              <input
                                type="number"
                                min="0"
                                defaultValue={item.quantity ?? 0}
                                onBlur={(e) => updateItem({
                                  itemId: item.id,
                                  updates: { quantity: parseQuantity(e.target.value) },
                                })}
                                aria-label="Beverage quantity"
                                className="h-7 w-full border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"
                              />
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0 align-top`}>
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-7 w-full min-w-0 items-center justify-between gap-1 rounded-xs border border-border px-2 text-xs text-muted-foreground hover:bg-muted"
                                  >
                                    <span className="truncate">
                                      {item.assignedTimeblockIds.length > 0
                                        ? `${item.assignedTimeblockIds.length} selected`
                                        : "Assign timeblocks"}
                                    </span>
                                    <ChevronDown size={12} className="shrink-0" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-48">
                                  {timeblocks.length === 0 ? (
                                    <DropdownMenuItem disabled>No beverage timeblocks yet</DropdownMenuItem>
                                  ) : (
                                    timeblocks.map((timeblock) => (
                                      <DropdownMenuCheckboxItem
                                        key={timeblock.id}
                                        checked={item.assignedTimeblockIds.includes(timeblock.id)}
                                        onCheckedChange={(checked) =>
                                          toggleTimeblockAssignment(item, timeblock.id, checked === true)
                                        }
                                      >
                                        {timeblock.title || "Untitled timeblock"}
                                      </DropdownMenuCheckboxItem>
                                    ))
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top text-right`}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem({ itemId: item.id })}
                                aria-label="Remove beverage item"
                                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TIMEBLOCK SECTION */}

        <div className="min-w-0 bg-background p-2">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-sm font-semibold tracking-wide">Timeblocks</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => addTimeblock({ title: "" })}>
              <Plus />
              Add Timeblock
            </Button>
          </div>

          {timeblocks.length === 0 ? (
            <div className="rounded-xs border border-dashed border-border bg-orange-50 px-4 py-4">
              <p className="text-sm text-muted-foreground">No beverage timeblocks yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeblocks.map((timeblock) => (
                <BeverageTimeblockCard
                  key={timeblock.id}
                  timeblock={timeblock}
                  updateTimeblock={updateTimeblock}
                  removeTimeblock={removeTimeblock}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface BeverageTimeblockCardProps {
  timeblock: Timeblock
  updateTimeblock: (payload: { id: string; updates: UpdateTimeblock }) => void
  removeTimeblock: (id: string) => void
}

const BeverageTimeblockCard: React.FC<BeverageTimeblockCardProps> = ({
  timeblock,
  updateTimeblock,
  removeTimeblock,
}) => (
  <section className="overflow-hidden rounded-xs border border-stone-200 bg-background shadow-sm">
    <TimeBlockHeader
      timeblockID={timeblock.id}
      title={timeblock.title ?? ""}
      titlePlaceholder="e.g. Cocktail Hour, Toast"
      sectionTitle="Beverage Planning"
      time={timeblock.time ?? ""}
      assignedTo={timeblock.assignedTo ?? ""}
      tail={<BeverageTimeblockHeaderTail deleteTimeblock={() => removeTimeblock(timeblock.id)} />}
      updateTimeblock={updateTimeblock}
    />
    <div className="bg-stone-50 px-3 py-2">
      <BeverageTimeblockNoteRow
        note={timeblock.details ?? ""}
        timeblockId={timeblock.id}
        updateTimeblock={updateTimeblock}
      />
    </div>
  </section>
)

export default BeverageWorkspaceSection
