import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router"
import { ChevronDown, EllipsisVertical, Info, Plus, Trash2 } from "lucide-react"

import type { BeverageItemType } from "~/definitions/database"
import type { BeverageItemWithAssignments } from "~/definitions/beverage/beverage-types"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  ITER_BEVERAGE_SERVICE_STYLE,
  ITER_BEVERAGE_TYPE,
} from "~/definitions/sections/section-constants"
import { useBeverageSection } from "~/hooks/useBeverageSection"
import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { Button } from "~/components/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import {
  DropdownMenu,
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
import {
  centsToDollars,
  computeBillableLineTotalCents,
  dollarsToCents,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import TimeblockTypeConvertControl from "~/features/event-detail/sections/setup-notes-workspaces/TimeblockTypeConvertControl"
import { PlanningTimeblockItemNoteRow } from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningTimeblockItemNoteRow"
import { getVisibleBeverageTypeSections } from "./beverage/beverageTypeSections"

interface BeverageEditorWorkspaceProps {
  timeblock: TimeblockWithItems
  onDeleted: () => void
}

function parseQuantity(value: string): number {
  return Math.max(0, Number(value) || 0)
}

function parsePrice(value: string): number {
  return Math.max(0, dollarsToCents(value))
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

const BeverageEditorWorkspace: React.FC<BeverageEditorWorkspaceProps> = ({
  timeblock,
  onDeleted,
}) => {
  const { id: eventId } = useParams()
  const {
    items,
    isLoading,
    isError,
    isFetching,
    refetch,
    updateTimeblock,
    removeTimeblock,
    addItemAssignedToTimeblock,
    updateItem,
    removeItem,
    setItemTimeblocks,
    isMutating,
  } = useBeverageSection()

  const [lastChosenType, setLastChosenType] = useState<BeverageItemType>("Beer")
  const [pendingDeleteItem, setPendingDeleteItem] = useState<BeverageItemWithAssignments | null>(null)
  const [expandedNoteItemIds, setExpandedNoteItemIds] = useState<ReadonlySet<string>>(() => new Set())
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

  const queuePendingNameFocus = useCallback(() => {
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
  }, [])

  const handleAddItem = useCallback((type: BeverageItemType) => {
    const id = crypto.randomUUID()
    setLastChosenType(type)
    pendingFocusItemIdRef.current = id
    addItemAssignedToTimeblock({
      id,
      type,
      timeblockId: timeblock.id,
      newItem: { name: "" },
    })
    queuePendingNameFocus()
  }, [addItemAssignedToTimeblock, queuePendingNameFocus, timeblock.id])

  const toggleAssignment = useCallback((item: BeverageItemWithAssignments, checked: boolean) => {
    const nextIds = checked
      ? [...new Set([...item.assignedTimeblockIds, timeblock.id])]
      : item.assignedTimeblockIds.filter((id) => id !== timeblock.id)

    setItemTimeblocks({ itemId: item.id, timeblockIds: nextIds })
  }, [setItemTimeblocks, timeblock.id])

  const handleRemoveClick = useCallback((item: BeverageItemWithAssignments) => {
    const otherAssignments = item.assignedTimeblockIds.filter((id) => id !== timeblock.id)
    if (otherAssignments.length > 0) {
      setPendingDeleteItem(item)
      return
    }
    removeItem({ itemId: item.id })
  }, [removeItem, timeblock.id])

  const toggleItemNotes = useCallback((itemId: string) => {
    setExpandedNoteItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteItem) return
    removeItem({ itemId: pendingDeleteItem.id })
    setPendingDeleteItem(null)
  }, [pendingDeleteItem, removeItem])

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  if (isLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">Loading beverage items…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <RouteBlockingError
        title="Could not load beverage items"
        description="This beverage timeblock is temporarily unavailable. Please retry."
        onRetry={handleRetry}
        isRetrying={isFetching}
      />
    )
  }

  const disabled = isMutating

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
      <section className="mb-8 rounded-xs border border-border border-stone-200 bg-background shadow-sm">
        <TimeBlockHeader
          timeblockID={timeblock.id}
          title={timeblock.title ?? ""}
          titlePlaceholder="e.g. Cocktail Hour, Toast"
          sectionTitle="Beverage"
          time={timeblock.time ?? ""}
          assignedTo={timeblock.assignedTo ?? ""}
          updateTimeblock={(payload) => {
            if (disabled) return
            updateTimeblock(payload)
          }}
          tail={
            <>
              {eventId ? (
                <TimeblockTypeConvertControl
                  eventId={eventId}
                  timeblockId={timeblock.id}
                  currentType={timeblock.sectionType}
                  disabled={disabled}
                />
              ) : null}

              <div className="inline-flex h-full items-stretch">
                <Button
                  type="button"
                  variant="darkSecondary"
                  className="h-full rounded-none border-x"
                  disabled={disabled}
                  onClick={() => handleAddItem(lastChosenType)}
                >
                  <Plus />
                  Add Item
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="darkSecondary"
                      aria-label="Choose beverage type"
                      disabled={disabled}
                      className="h-full rounded-none border-r border-stone-600 px-2 hover:bg-stone-600 hover:text-orange-400"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onCloseAutoFocus={(event) => event.preventDefault()}
                  >
                    {ITER_BEVERAGE_TYPE.map((type) => (
                      <DropdownMenuItem key={type} onClick={() => handleAddItem(type)}>
                        {type}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="darkSecondary"
                    aria-label="Timeblock header actions"
                    disabled={disabled}
                    className="m-0 h-full rounded-none rounded-tr-xs hover:bg-stone-600 hover:text-orange-500"
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      removeTimeblock(timeblock.id, {
                        onSuccess: () => onDeleted(),
                      })
                    }}
                  >
                    Delete Timeblock
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <div className="border-x border-stone-200 bg-white px-3 py-2">
          <label className="block">
            <span className="sr-only">Timeblock overview notes</span>
            <textarea
              key={`${timeblock.id}-details-${timeblock.updatedAt ?? "new"}`}
              defaultValue={timeblock.details ?? ""}
              disabled={disabled}
              onBlur={(e) =>
                updateTimeblock({
                  id: timeblock.id,
                  updates: { details: e.target.value },
                })
              }
              placeholder="Overview notes for this beverage timeblock…"
              aria-label="Timeblock overview notes"
              className="min-h-16 w-full rounded-xs border border-transparent bg-stone-50 px-2.5 py-2 text-sm text-stone-600 outline-none transition-colors field-sizing-content focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
            />
          </label>
        </div>

        {items.length === 0 ? (
          <div className="space-y-3 px-3 py-4">
            <div className="rounded-xs border border-dashed border-border bg-orange-50 px-3 py-4 text-sm text-muted-foreground">
              No beverage items yet. Add an item to include it on this timeblock.
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-b-xs bg-stone-50 px-3 py-3">
            {typeSections.map((section) => (
              <div key={section.type} className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.type}
                </h5>
                <div className={SECTION_TABLE_CONTAINER_CLASS}>
                  <table className={`${SECTION_TABLE_CLASS} min-w-[1100px]`}>
                    <thead>
                      <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} w-16`}>Include</th>
                        <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} pl-2`}>Item</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Type</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Service Style</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.length === 0 ? (
                        <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
                          <td colSpan={8} className="px-1.5 py-3 text-xs text-muted-foreground">
                            No {section.type.toLowerCase()} items yet.
                          </td>
                        </tr>
                      ) : (
                        section.items.map((item) => {
                          const isAssigned = item.assignedTimeblockIds.includes(timeblock.id)
                          const notesExpanded = expandedNoteItemIds.has(item.id)
                          const hasNotes = Boolean(item.includes?.trim())

                          return (
                            <React.Fragment key={item.id}>
                              <tr data-beverage-item-id={item.id}>
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top`}>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    disabled={disabled}
                                    onChange={(e) => toggleAssignment(item, e.target.checked)}
                                    aria-label={`Include ${item.name || "item"} on this timeblock`}
                                    className="mt-2 size-4 accent-orange-600"
                                  />
                                </td>
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[200px] align-top`}>
                                  <input
                                    data-cell="item"
                                    type="text"
                                    defaultValue={item.name ?? ""}
                                    disabled={disabled}
                                    onBlur={(e) =>
                                      updateItem({
                                        itemId: item.id,
                                        updates: { name: e.target.value },
                                      })
                                    }
                                    aria-label="Beverage item name"
                                    placeholder="Untitled item"
                                    className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm font-medium outline-none transition-colors focus:border-border focus:bg-background disabled:opacity-60"
                                  />
                                </td>
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[150px] align-top`}>
                                  <select
                                    defaultValue={item.type}
                                    disabled={disabled}
                                    onBlur={(e) =>
                                      updateItem({
                                        itemId: item.id,
                                        updates: { type: e.target.value as BeverageItemType },
                                      })
                                    }
                                    aria-label="Beverage type"
                                    className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
                                  >
                                    {ITER_BEVERAGE_TYPE.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[160px] align-top`}>
                                  <select
                                    defaultValue={item.serviceStyle ?? ""}
                                    disabled={disabled}
                                    onBlur={(e) =>
                                      updateItem({
                                        itemId: item.id,
                                        updates: {
                                          serviceStyle: (e.target.value || null) as BeverageItemWithAssignments["serviceStyle"],
                                        },
                                      })
                                    }
                                    aria-label="Service Style"
                                    className="h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 text-sm text-muted-foreground outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground disabled:opacity-60"
                                  >
                                    <option value="">Select...</option>
                                    {ITER_BEVERAGE_SERVICE_STYLE.map((style) => (
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
                                        itemId: item.id,
                                        updates: { quantity: parseQuantity(e.target.value) },
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
                                        itemId: item.id,
                                        updates: { unitPriceCents: parsePrice(e.target.value) },
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
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} w-[96px] align-top text-right`}>
                                  <div className="inline-flex items-center justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleItemNotes(item.id)}
                                      aria-label={notesExpanded ? "Hide item notes" : "Show item notes"}
                                      aria-pressed={notesExpanded}
                                      className={`h-8 px-2 ${
                                        notesExpanded || hasNotes
                                          ? "text-orange-600 hover:text-orange-700"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      <Info />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={disabled}
                                      onClick={() => handleRemoveClick(item)}
                                      aria-label="Remove beverage item"
                                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {notesExpanded ? (
                                <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
                                  <td colSpan={8} className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-[240px] align-top`}>
                                    <PlanningTimeblockItemNoteRow
                                      key={`${timeblock.id}_${item.id}_notesRow`}
                                      timeblockID={timeblock.id}
                                      itemID={item.id}
                                      note={item.includes ?? ""}
                                      updateItem={({ itemId, updates }) =>
                                        updateItem({
                                          itemId,
                                          updates: {
                                            includes: updates.includes ?? null,
                                          },
                                        })
                                      }
                                    />
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={pendingDeleteItem !== null}
        onOpenChange={(open) => (!open ? setPendingDeleteItem(null) : undefined)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete beverage item?</DialogTitle>
            <DialogDescription>
              {pendingDeleteItem
                ? `"${pendingDeleteItem.name.trim() || "Untitled item"}" is also assigned to ${
                    pendingDeleteItem.assignedTimeblockIds.filter((id) => id !== timeblock.id).length
                  } other timeblock${
                    pendingDeleteItem.assignedTimeblockIds.filter((id) => id !== timeblock.id).length === 1
                      ? ""
                      : "s"
                  }. Deleting it removes it from every timeblock in this event.`
                : "This will permanently delete the beverage item from this event."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BeverageEditorWorkspace
