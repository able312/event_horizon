import { useState } from "react"
import { Plus, X } from "lucide-react"

import { Button } from "~/components/atoms/button"
import type { FoodMenuCategory } from "~/definitions/database"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"

type FoodMenuCategoryManagerProps = {
  /** All categories, already sorted. */
  categories: readonly FoodMenuCategory[]
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (category: FoodMenuCategory) => void
}

/** The food menu's categories as editable chips, plus a field to add one. */
export const FoodMenuCategoryManager: React.FC<FoodMenuCategoryManagerProps> = ({
  categories,
  onAdd,
  onRename,
  onRemove,
}) => {
  const [draft, setDraft] = useState("")

  const submit = () => {
    if (!draft.trim()) return
    onAdd(draft)
    setDraft("")
  }

  return (
    <div className="space-y-3">
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">No categories yet. Add a course like "Mains", or a whole menu like "Wedding Menu".</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={getRecordRenderKey(category.id)}
              className="inline-flex items-center rounded-xs border border-orange-200 bg-orange-50 pl-2 text-xs text-orange-800"
            >
              <input
                // Keyed by the stored value so a rename from another window refreshes the field
                key={category.name}
                type="text"
                defaultValue={category.name}
                aria-label={`Rename ${category.name}`}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name) e.target.value = category.name
                  else if (name !== category.name) onRename(category.id, name)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur()
                }}
                className="h-6 bg-transparent outline-none field-sizing-content min-w-8"
              />
              <button
                type="button"
                aria-label={`Delete ${category.name}`}
                onClick={() => onRemove(category)}
                className="inline-flex h-6 items-center px-1.5 text-orange-700 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New category"
          aria-label="New category name"
          className="h-7 w-48 border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!draft.trim()}>
          <Plus />
          Add category
        </Button>
      </form>
    </div>
  )
}
