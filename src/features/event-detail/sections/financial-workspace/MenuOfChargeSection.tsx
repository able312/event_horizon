import React, { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"

import type {
  BeverageItem,
  ChargeCategory,
  MenuOfChargeItem,
  UpdateMenuOfChargeItem,
} from "~/definitions/database"
import { ITER_MENU_OF_CHARGE_CATEGORY } from "~/definitions/sections/section-constants"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { useMenuOfChargeItemsSection } from "~/hooks/useMenuOfChargeSection"
import {
  centsToDollars,
  computeBillableLineTotalCents,
  computeMenuSubtotalCents,
  dollarsToCents,
  toCurrency,
} from "~/features/event-detail/workspace/lib/financial"
import type { GuestCountRange } from "~/features/preview/lib/foodPackages"
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
import FinancialCard, { FINANCIAL_EMPTY_STATE_CLASS } from "./FinancialCard"
import {
  BeveragePlanningBillingSection,
  FoodPlanningBillingSection,
  type BillingItemUpdates,
  type BillingTimeblockUpdates,
} from "./PlanningBillingSections"

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
  beverageItems?: BeverageItem[]
  onNavigateToFood?: () => void
  onNavigateToBeverage?: () => void
  /** The event's guest count, which prices per-person food and beverage lines. */
  guests?: GuestCountRange | null
  onUpdateFoodBillingItem?: (payload: {
    timeblockId: string
    itemId: string
    updates: BillingItemUpdates
  }) => void
  onUpdateBeverageBillingItem?: (payload: {
    itemId: string
    updates: BillingItemUpdates
  }) => void
  onUpdateFoodBillingTimeblock?: (payload: {
    timeblockId: string
    updates: BillingTimeblockUpdates
  }) => void
}

interface CategorySection {
  key: string
  label: string
  category: ChargeCategory | null
  items: MenuOfChargeItem[]
}

const UNCATEGORIZED_KEY = "__uncategorized__"

const MenuOfChargeSection: React.FC<MenuOfChargeSectionProps> = ({
  className,
  emptyStateMode = "default",
  foodTimeblocks = [],
  beverageItems = [],
  onNavigateToFood,
  onNavigateToBeverage,
  guests = null,
  onUpdateFoodBillingItem,
  onUpdateBeverageBillingItem,
  onUpdateFoodBillingTimeblock,
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

  // Empty categories only appear while an item is being dragged, as drop targets.
  const visibleSections = draggedItemId
    ? categorySections
    : categorySections.filter((section) => section.items.length > 0)

  const addItemButton = (
    <div className="flex items-stretch overflow-hidden rounded-xs border border-border">
      <Button
        type="button"
        variant="ghost"
        className="h-8 rounded-none border-r border-border px-2 text-sm"
        onClick={handlePrimaryAdd}
      >
        <Plus className="size-3.5" />
        Add Item
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-none"
            aria-label="Choose add category"
          >
            <ChevronDown className="size-3.5" />
          </Button>
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
  )

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <FoodPlanningBillingSection
        timeblocks={foodTimeblocks}
        guests={guests}
        onNavigateToPlanning={onNavigateToFood}
        onUpdateItem={onUpdateFoodBillingItem}
        onUpdateTimeblock={onUpdateFoodBillingTimeblock}
      />
      <BeveragePlanningBillingSection
        items={beverageItems}
        guests={guests}
        onNavigateToPlanning={onNavigateToBeverage}
        onUpdateItem={onUpdateBeverageBillingItem}
      />

      <FinancialCard
        title="Other Charges"
        description="Venue, service, golf and other charges added by hand. Drag a row to change its category."
        actions={addItemButton}
        footer={items.length > 0 ? `Other Charges Subtotal: ${toCurrency(menuSubtotalCents)}` : undefined}
      >
        {items.length === 0 ? (
          emptyStateMode === "workspace" ? (
            <div className={FINANCIAL_EMPTY_STATE_CLASS}>
              <p>No charge items yet.</p>
              <p className="mt-1">Add venue fees, staffing or anything else not planned in Food or Beverage.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-8 rounded-xs px-2 text-sm"
                onClick={handlePrimaryAdd}
              >
                <Plus className="size-3.5" />
                Add First Charge Item
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No charge items yet. Add an item to begin.</p>
          )
        ) : (
          <div className={SECTION_TABLE_CONTAINER_CLASS}>
            <table className={`${SECTION_TABLE_CLASS} table-fixed min-w-[640px] tabular-nums`} data-charge-item="true">
              <colgroup>
                <col />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_LEFT}>Item</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Qty</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Unit Price ($)</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}>Line Total</th>
                  <th className={SECTION_TABLE_HEAD_CELL_CLASS_RIGHT}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>

              {visibleSections.map((section) => {
                const isDropTarget = dragOverCategoryKey === section.key

                return (
                  <tbody
                    key={section.key}
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
                    <tr className={`transition-colors ${isDropTarget ? "bg-orange-50 text-orange-700" : "text-muted-foreground"}`}>
                      <th
                        scope="rowgroup"
                        colSpan={3}
                        className="px-1.5 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {section.label}
                      </th>
                      <td className="px-1.5 pb-1 pt-3 text-right text-xs font-medium">
                        {section.items.length > 0 ? (
                          <span aria-label={`${section.label} subtotal`}>
                            {toCurrency(computeMenuSubtotalCents(section.items))}
                          </span>
                        ) : null}
                      </td>
                      <td />
                    </tr>
                    {section.items.length === 0 ? (
                      <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
                        <td colSpan={5} className="px-1.5 py-2 text-xs text-muted-foreground">
                          Drop here to move to {section.label}.
                        </td>
                      </tr>
                    ) : (
                        section.items.map((item) => {
                          const lineTotalCents = computeBillableLineTotalCents(item)
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
                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-middle`}>
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

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-middle text-right`}>
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

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-middle text-right`}>
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

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-middle text-right font-medium`}>
                                  {toCurrency(lineTotalCents)}
                                </td>

                                <td className={`${SECTION_TABLE_BODY_CELL_CLASS} align-middle`}>
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
                )
              })}
            </table>
          </div>
        )}
      </FinancialCard>
    </div>
  )
}

export default MenuOfChargeSection
