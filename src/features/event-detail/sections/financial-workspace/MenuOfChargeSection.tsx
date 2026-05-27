import React, { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type {
  BeverageItem,
  ChargeCategory,
  FoodItem,
  MenuOfChargeItem,
  UpdateMenuOfChargeItem,
} from "~/definitions/database"
import { ITER_MENU_OF_CHARGE_CATEGORY } from "~/definitions/sections/section-constants"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import {
  centsToDollars,
  computeBillableLineTotalCents,
  computeChargeLineTotalCents,
  computeMenuSubtotalCents,
  dollarsToCents,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "../../../../components/event-detail/detail-sections/sections/tableStyles"

function focusNextCell(rowId: string, currentCellIndex: number) {
  const rowCells = document.querySelectorAll<HTMLElement>(`[data-row-id="${rowId}"] [data-cell]`)
  const nextCell = rowCells[currentCellIndex + 1]

  if (nextCell) {
    nextCell.focus()
  }
}

interface MenuOfChargeSectionProps {
  className?: string
  emptyStateMode?: "default" | "workspace"
  foodTimeblocks?: TimeblockWithItems[]
  beverageTimeblocks?: TimeblockWithItems[]
  onNavigateToFood?: () => void
  onNavigateToBeverage?: () => void
  onUpdateFoodBillingItem?: (payload: {
    timeblockId: string
    itemId: string
    updates: Pick<Partial<FoodItem>, "quantity" | "unitPriceCents">
  }) => void
  onUpdateBeverageBillingItem?: (payload: {
    timeblockId: string
    itemId: string
    updates: Pick<Partial<BeverageItem>, "quantity" | "unitPriceCents">
  }) => void
}

interface CategorySection {
  key: string
  label: string
  category: ChargeCategory | null
  items: MenuOfChargeItem[]
}

interface BillingItem {
  id: string
  name: string
  quantity: number | null
  unitPriceCents: number | null
}

interface PlanningBillingSectionProps {
  title: string
  timeblocks: TimeblockWithItems[]
  itemKey: "foodItems" | "beverageItems"
  onNavigateToPlanning?: () => void
  onUpdateItem?: (payload: {
    timeblockId: string
    itemId: string
    updates: { quantity?: number | null; unitPriceCents?: number | null }
  }) => void
}

const UNCATEGORIZED_KEY = "__uncategorized__"

function renderPlanningCta(onNavigateToPlanning?: () => void, prefix = "Start planning") {
  if (!onNavigateToPlanning) return null

  return (
    <button
      type="button"
      onClick={onNavigateToPlanning}
      className="inline-flex items-center text-xs font-medium text-primary hover:underline"
    >
      {prefix}
    </button>
  )
}

const PlanningBillingSection: React.FC<PlanningBillingSectionProps> = ({
  title,
  timeblocks,
  itemKey,
  onNavigateToPlanning,
  onUpdateItem,
}) => {
  const subtotalCents = timeblocks.reduce((sum, timeblock) => {
    const items = (timeblock[itemKey] ?? []) as BillingItem[]
    return sum + items.reduce((itemSum, item) => itemSum + computeBillableLineTotalCents(item), 0)
  }, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        <span className="rounded-full border border-border bg-orange-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-700">
          From Planning
        </span>
      </div>
      <p className="text-xs text-muted-foreground">These items are organized in planning. Adjust qty and pricing here.</p>

      {timeblocks.length === 0 ? (
        <div className="rounded-xs border border-dashed border-border px-3 py-3 text-xs text-muted-foreground bg-red-50">
          <span className="text-red-800">No {title.toLowerCase()} timeblocks from planning yet. </span>
          {renderPlanningCta(onNavigateToPlanning)}
        </div>
      ) : (
        <div className="space-y-3">
          {timeblocks.map((timeblock) => {
            const items = (timeblock[itemKey] ?? []) as BillingItem[]

            return (
              <div key={timeblock.id} className="space-y-0.5">
                <div className="border-b border-border/70 bg-muted/25 px-2 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{timeblock.title}</p>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xs border border-dashed border-border px-3 py-3 text-xs text-muted-foreground bg-yellow-50">
                    <span>There are no items for this. </span>
                    {renderPlanningCta(onNavigateToPlanning)}
                  </div>
                ) : (
                  <div className={SECTION_TABLE_CONTAINER_CLASS}>
                    <table className={`${SECTION_TABLE_CLASS} min-w-[640px]`}>
                      <thead>
                        <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                          <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
                          <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                          <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price ($)</th>
                          <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className={SECTION_TABLE_BODY_ROW_CLASS}>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-xs text-foreground`}>
                              {item.name || "Untitled item"}
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
                              <input
                                type="number"
                                min="0"
                                defaultValue={item.quantity ?? 0}
                                onBlur={(e) => onUpdateItem?.({
                                  timeblockId: timeblock.id,
                                  itemId: item.id,
                                  updates: { quantity: Math.max(0, Number(e.target.value) || 0) },
                                })}
                                className="ml-auto block h-7 w-14 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"
                                aria-label={`${title} Quantity`}
                              />
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
                              <input
                                type="text"
                                inputMode="decimal"
                                defaultValue={centsToDollars(item.unitPriceCents).toFixed(2)}
                                onBlur={(e) => onUpdateItem?.({
                                  timeblockId: timeblock.id,
                                  itemId: item.id,
                                  updates: { unitPriceCents: Math.max(0, dollarsToCents(e.target.value)) },
                                })}
                                className="ml-auto block h-7 w-20 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"
                                aria-label={`${title} Unit Price`}
                              />
                            </td>
                            <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right text-xs font-medium`}>
                              {toCurrency(computeBillableLineTotalCents(item))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="px-1.5 pt-1 text-right text-xs font-medium text-foreground">
        {title} Subtotal: {toCurrency(subtotalCents)}
      </div>
    </div>
  )
}

const MenuOfChargeSection: React.FC<MenuOfChargeSectionProps> = ({
  className,
  emptyStateMode = "default",
  foodTimeblocks = [],
  beverageTimeblocks = [],
  onNavigateToFood,
  onNavigateToBeverage,
  onUpdateFoodBillingItem,
  onUpdateBeverageBillingItem,
}) => {
  const {
    data: menuOfChargeItems,
    createMenuOfChargeItemAsync,
    updateMenuOfChargeItem,
    deleteMenuOfChargeItemAsync,
  } = useMenuOfChargeItemsSection()

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [lastChosenCategory, setLastChosenCategory] = useState<ChargeCategory | null>(null)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverCategoryKey, setDragOverCategoryKey] = useState<string | null>(null)
  const focusNewRowRef = useRef(false)

  useEffect(() => {
    if (!focusNewRowRef.current) return
    focusNewRowRef.current = false

    const firstInput = document.querySelector<HTMLInputElement>('[data-charge-item="true"] [data-cell="item"]')
    firstInput?.focus()
  }, [menuOfChargeItems])

  useEffect(() => {
    const items = menuOfChargeItems ?? []
    setPriceDrafts((prev) => {
      const next: Record<string, string> = {}
      for (const item of items) {
        if (editingPriceId === item.id && prev[item.id] != null) {
          next[item.id] = prev[item.id]
        } else {
          next[item.id] = centsToDollars(item.unitPriceCents).toFixed(2)
        }
      }
      return next
    })
  }, [menuOfChargeItems, editingPriceId])

  const handleUpdate = (id: string, updates: UpdateMenuOfChargeItem) => {
    updateMenuOfChargeItem({ id, updates })
  }

  const handleAddItem = async (category?: ChargeCategory | null) => {
    focusNewRowRef.current = true
    await createMenuOfChargeItemAsync(category ?? null)
  }

  const handlePrimaryAdd = async () => {
    await handleAddItem(lastChosenCategory)
  }

  const handleCategoryAdd = async (category: ChargeCategory | null) => {
    setLastChosenCategory(category)
    await handleAddItem(category)
  }

  const handleDelete = async (item: MenuOfChargeItem) => {
    await deleteMenuOfChargeItemAsync(item.id)

    toast("Item deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const restored = await createMenuOfChargeItemAsync(item.category ?? null)
          handleUpdate(restored.id, {
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            includes: item.includes,
          })
        },
      },
    })
  }

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const items = useMemo(() => menuOfChargeItems ?? [], [menuOfChargeItems])
  const menuSubtotalCents = computeMenuSubtotalCents(items)
  const foodSubtotalCents = foodTimeblocks.reduce((sum, timeblock) => (
    sum + (timeblock.foodItems ?? []).reduce((itemSum, item) => itemSum + computeBillableLineTotalCents(item), 0)
  ), 0)
  const beverageSubtotalCents = beverageTimeblocks.reduce((sum, timeblock) => (
    sum + (timeblock.beverageItems ?? []).reduce((itemSum, item) => itemSum + computeBillableLineTotalCents(item), 0)
  ), 0)
  const chargesSubtotalCents = menuSubtotalCents + foodSubtotalCents + beverageSubtotalCents
  const hasPlanningContent = foodTimeblocks.length > 0 || beverageTimeblocks.length > 0

  const categorySections = useMemo<CategorySection[]>(() => {
    const buckets = new Map<string, MenuOfChargeItem[]>()
    buckets.set(UNCATEGORIZED_KEY, [])

    for (const category of ITER_MENU_OF_CHARGE_CATEGORY) {
      buckets.set(category, [])
    }

    for (const item of items) {
      const key = item.category ?? UNCATEGORIZED_KEY
      if (!buckets.has(key)) {
        buckets.set(key, [])
      }
      buckets.get(key)!.push(item)
    }

    const sections: CategorySection[] = [
      {
        key: UNCATEGORIZED_KEY,
        label: "Uncategorized",
        category: null,
        items: buckets.get(UNCATEGORIZED_KEY) ?? [],
      },
    ]

    for (const category of ITER_MENU_OF_CHARGE_CATEGORY) {
      sections.push({
        key: category,
        label: category,
        category,
        items: buckets.get(category) ?? [],
      })
    }

    return sections
  }, [items])

  const handleDragStart = (itemId: string) => {
    setDraggedItemId(itemId)
  }

  const handleDropToCategory = (targetCategory: ChargeCategory | null) => {
    if (!draggedItemId) return

    const draggedItem = items.find((item) => item.id === draggedItemId)
    setDraggedItemId(null)
    setDragOverCategoryKey(null)

    if (!draggedItem) return
    if ((draggedItem.category ?? null) === targetCategory) return

    handleUpdate(draggedItem.id, { category: targetCategory })

    toast.success(`Moved to ${targetCategory ?? "Uncategorized"}`)
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-semibold tracking-wide">Menu of Charges</h3>

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
                aria-label="Choose add category"
                className="inline-flex h-full min-h-[22px] items-center rounded-r-xs border border-orange-200 bg-orange-100 px-2 text-orange-700 hover:bg-orange-50"
              >
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {ITER_MENU_OF_CHARGE_CATEGORY.map((category) => (
                <DropdownMenuItem key={category} onClick={() => handleCategoryAdd(category)}>
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {items.length === 0 && !hasPlanningContent ? (
        emptyStateMode === "workspace" ? (
          <div className="space-y-6 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">No charge items yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">Start your estimate by adding your first charge item.</p>
              <button
                type="button"
                onClick={handlePrimaryAdd}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-orange-500 text-orange-100 border border-orange-200 px-3 py-2 text-sm font-semibold transition-colors hover:bg-orange-50"
              >
                <Plus size={14} />
                Add First Charge Item
              </button>
            </div>

            <div className="space-y-6">
              <PlanningBillingSection
                title="Food"
                timeblocks={foodTimeblocks}
                itemKey="foodItems"
                onNavigateToPlanning={onNavigateToFood}
                onUpdateItem={onUpdateFoodBillingItem}
              />
              <PlanningBillingSection
                title="Beverage"
                timeblocks={beverageTimeblocks}
                itemKey="beverageItems"
                onNavigateToPlanning={onNavigateToBeverage}
                onUpdateItem={onUpdateBeverageBillingItem}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <p className="text-sm text-muted-foreground">No charge items yet. Add an item to begin.</p>
            <PlanningBillingSection
              title="Food"
              timeblocks={foodTimeblocks}
              itemKey="foodItems"
              onNavigateToPlanning={onNavigateToFood}
              onUpdateItem={onUpdateFoodBillingItem}
            />
            <PlanningBillingSection
              title="Beverage"
              timeblocks={beverageTimeblocks}
              itemKey="beverageItems"
              onNavigateToPlanning={onNavigateToBeverage}
              onUpdateItem={onUpdateBeverageBillingItem}
            />
          </div>
        )
      ) : (
        <div className="space-y-6 pt-3">
          {categorySections.map((section) => {
            const isDropTarget = dragOverCategoryKey === section.key

            return (
              <div key={section.key} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</h4>

                <div
                  className={`${SECTION_TABLE_CONTAINER_CLASS} transition-colors ${isDropTarget ? "ring-1 ring-primary/40" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOverCategoryKey(section.key)
                  }}
                  onDragLeave={() => {
                    if (dragOverCategoryKey === section.key) setDragOverCategoryKey(null)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    handleDropToCategory(section.category)
                  }}
                >
                  <table className={`${SECTION_TABLE_CLASS} min-w-[640px]`} data-charge-item="true">
                    <thead>
                      <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price ($)</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                        <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {section.items.length === 0 ? (
                        <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
                          <td colSpan={5} className="px-1.5 py-3 text-xs text-muted-foreground">
                            Drop items here or add a new item to this category.
                          </td>
                        </tr>
                      ) : (
                        section.items.map((item) => {
                          const lineTotalCents = computeChargeLineTotalCents(item)
                          const isExpanded = Boolean(expandedRows[item.id])

                          return (
                            <React.Fragment key={item.id}>
                              <tr
                                className={SECTION_TABLE_BODY_ROW_CLASS}
                                data-row-id={item.id}
                                draggable
                                onDragStart={() => handleDragStart(item.id)}
                                onDragEnd={() => {
                                  setDraggedItemId(null)
                                  setDragOverCategoryKey(null)
                                }}
                              >
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top`}>
                                  <div className="flex items-center gap-1">
                                    <span className="cursor-grab text-muted-foreground" title="Drag to move category">
                                      <GripVertical size={14} />
                                    </span>
                                    <input
                                      data-cell="item"
                                      type="text"
                                      defaultValue={item.name}
                                      placeholder="Item name"
                                      onBlur={(e) => handleUpdate(item.id, { name: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault()
                                          ;(e.currentTarget as HTMLInputElement).blur()
                                          focusNextCell(item.id, 0)
                                        }
                                      }}
                                      className="h-7 w-full border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                </td>

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top text-right`}>
                                  <input
                                    data-cell
                                    type="number"
                                    min="0"
                                    defaultValue={item.quantity ?? 0}
                                    onBlur={(e) => handleUpdate(item.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        ;(e.currentTarget as HTMLInputElement).blur()
                                        focusNextCell(item.id, 1)
                                      }
                                    }}
                                    className="ml-auto block h-7 w-14 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"
                                  />
                                </td>

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top text-right`}>
                                  <input
                                    data-cell
                                    type="text"
                                    inputMode="decimal"
                                    value={priceDrafts[item.id] ?? centsToDollars(item.unitPriceCents).toFixed(2)}
                                    onChange={(e) => {
                                      setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                                    }}
                                    onFocus={() => {
                                      setEditingPriceId(item.id)
                                      setPriceDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: prev[item.id] ?? centsToDollars(item.unitPriceCents).toFixed(2),
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const cents = Math.max(0, dollarsToCents(e.target.value))
                                      setEditingPriceId((current) => (current === item.id ? null : current))
                                      setPriceDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: centsToDollars(cents).toFixed(2),
                                      }))
                                      handleUpdate(item.id, { unitPriceCents: cents })
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        ;(e.currentTarget as HTMLInputElement).blur()
                                        focusNextCell(item.id, 2)
                                      }
                                    }}
                                    className="ml-auto block h-7 w-20 border-0 border-b border-border bg-transparent px-1 text-right text-xs focus:border-primary focus:outline-none"
                                  />
                                </td>

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top text-right font-medium`}>
                                  {toCurrency(lineTotalCents)}
                                </td>

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-top`}>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                                      onClick={() => toggleExpanded(item.id)}
                                      title="Toggle notes"
                                    >
                                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                      onClick={() => handleDelete(item)}
                                      title="Delete row"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {isExpanded ? (
                                <tr className="border-b border-border/60 bg-muted/30">
                                  <td colSpan={5} className="px-1.5 py-1.5">
                                    <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Notes</label>
                                    <textarea
                                      defaultValue={item.includes ?? ""}
                                      placeholder="Includes / notes"
                                      onBlur={(e) => handleUpdate(item.id, { includes: e.target.value })}
                                      className="min-h-16 w-full border-0 border-b border-border bg-transparent px-1 py-1 text-xs focus:border-primary focus:outline-none"
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
            )
          })}

          <PlanningBillingSection
            title="Food"
            timeblocks={foodTimeblocks}
            itemKey="foodItems"
            onNavigateToPlanning={onNavigateToFood}
            onUpdateItem={onUpdateFoodBillingItem}
          />

          <PlanningBillingSection
            title="Beverage"
            timeblocks={beverageTimeblocks}
            itemKey="beverageItems"
            onNavigateToPlanning={onNavigateToBeverage}
            onUpdateItem={onUpdateBeverageBillingItem}
          />

          <div className="px-1.5 py-2 text-right text-xs font-medium text-foreground">
            Charges Subtotal: {toCurrency(chargesSubtotalCents)}
          </div>
        </div>
      )}
    </section>
  )
}

export default MenuOfChargeSection
