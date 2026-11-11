import { useState } from "react"
import { Plus } from "lucide-react"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { Skeleton } from "~/components/atoms/skeleton"
import type { FoodMenuCategory } from "~/definitions/database"
import { useFoodMenuCategories, useFoodTemplates } from "~/hooks/useFoodTemplates"
import { usePendingRowFocus } from "~/hooks/usePendingRowFocus"
import {
  categoryIdsForNewItem,
  filterFoodMenu,
  sortByName,
  type FoodMenuFilter as FoodMenuFilterValue,
} from "~/lib/foodMenu/foodMenu"

import { SettingsSection } from "../components/SettingsSection"
import { DeleteFoodMenuCategoryDialog } from "./DeleteFoodMenuCategoryDialog"
import { FoodMenuCategoryManager } from "./FoodMenuCategoryManager"
import { FoodMenuFilter } from "./FoodMenuFilter"
import { FoodMenuTable } from "./FoodMenuTable"

function findTemplateNameInput(clientId: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(`[data-food-template-id="${clientId}"] [data-cell="name"]`)
}

/** Settings → Food Menu: the venue's saved food items and their categories, ready to add to any event. */
export const FoodMenuSettings: React.FC = () => {
  const templatesQuery = useFoodTemplates()
  const categoriesQuery = useFoodMenuCategories()
  const { templates, addTemplate, updateTemplate, removeTemplate } = templatesQuery
  const { addCategory, renameCategory, removeCategory } = categoriesQuery

  const [filter, setFilter] = useState<FoodMenuFilterValue>("all")
  const [expandedNoteIds, setExpandedNoteIds] = useState<ReadonlySet<string>>(() => new Set())
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<FoodMenuCategory | null>(null)
  const focusNewTemplateName = usePendingRowFocus(findTemplateNameInput, templates)

  const categories = sortByName(categoriesQuery.categories)
  // A deleted category (here or in another window) falls back to every item
  const activeFilter = filter === "all" || filter === "none" || categories.some((c) => c.id === filter) ? filter : "all"
  const usageCount = (categoryId: string) => templates.filter((t) => t.categoryIds.includes(categoryId)).length

  const handleAddItem = () => {
    const id = crypto.randomUUID()
    focusNewTemplateName(id)
    addTemplate({ id, categoryIds: categoryIdsForNewItem(activeFilter) })
  }

  const handleRemoveCategory = (category: FoodMenuCategory) => {
    if (usageCount(category.id) > 0) setPendingDeleteCategory(category)
    else removeCategory(category.id)
  }

  const toggleNotes = (renderKey: string) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev)
      if (next.has(renderKey)) next.delete(renderKey)
      else next.add(renderKey)
      return next
    })
  }

  if (templatesQuery.isError || categoriesQuery.isError) {
    return (
      <RouteBlockingError
        title="Could not load the food menu"
        description="The saved food items are temporarily unavailable. Please retry."
        onRetry={async () => {
          await Promise.all([templatesQuery.refetch(), categoriesQuery.refetch()])
        }}
        isRetrying={templatesQuery.isFetching || categoriesQuery.isFetching}
      />
    )
  }

  if (templatesQuery.isLoading || categoriesQuery.isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Categories"
        description="Group saved items by course or by menu. An item can be in more than one category."
      >
        <FoodMenuCategoryManager
          categories={categories}
          onAdd={(name) => addCategory({ id: crypto.randomUUID(), name })}
          onRename={(id, name) => renameCategory({ id, updates: { name } })}
          onRemove={handleRemoveCategory}
        />
      </SettingsSection>

      <SettingsSection
        title="Food"
        description="Changes here apply to food added from now on. Events that already have an item keep their own copy."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FoodMenuFilter categories={categories} value={activeFilter} onChange={setFilter} />
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 rounded-xs border border-orange-200 bg-orange-100 px-2 text-sm text-orange-700 hover:bg-orange-50"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>
        <FoodMenuTable
          templates={filterFoodMenu(templates, categories, activeFilter)}
          categories={categories}
          emptyCopy={activeFilter === "all" ? "No saved food items yet." : "No saved food items in this category."}
          expandedNoteIds={expandedNoteIds}
          onToggleNotes={toggleNotes}
          onUpdate={(id, updates) => updateTemplate({ id, updates })}
          onRemove={removeTemplate}
        />
      </SettingsSection>

      <DeleteFoodMenuCategoryDialog
        category={pendingDeleteCategory}
        itemCount={pendingDeleteCategory ? usageCount(pendingDeleteCategory.id) : 0}
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={() => {
          if (pendingDeleteCategory) removeCategory(pendingDeleteCategory.id)
          setPendingDeleteCategory(null)
        }}
      />
    </div>
  )
}
