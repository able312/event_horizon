import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import type { FoodMenuCategory } from "~/definitions/database"
import { toggleCategoryId } from "~/lib/foodMenu/foodMenu"

type FoodMenuCategoryPickerProps = {
  /** All categories, already sorted. */
  categories: readonly FoodMenuCategory[]
  selectedIds: readonly string[]
  itemLabel: string
  onChange: (categoryIds: string[]) => void
}

/** A saved food item's categories: the names it has, and a checklist to change them. */
export const FoodMenuCategoryPicker: React.FC<FoodMenuCategoryPickerProps> = ({
  categories,
  selectedIds,
  itemLabel,
  onChange,
}) => {
  const selectedNames = categories.filter((category) => selectedIds.includes(category.id)).map((category) => category.name)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${itemLabel} categories`}
          className="flex h-7 w-full min-w-0 items-center gap-1 border-b border-border px-1 text-left text-xs focus:border-primary focus:outline-none"
        >
          <span className={`min-w-0 flex-1 truncate ${selectedNames.length ? "" : "text-muted-foreground"}`}>
            {selectedNames.length ? selectedNames.join(", ") : "None"}
          </span>
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {categories.length === 0 ? (
          <DropdownMenuItem disabled>Add categories above first</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category.id}
              checked={selectedIds.includes(category.id)}
              // Keep the menu open so several categories can be ticked in a row
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => onChange(toggleCategoryId(selectedIds, category.id, checked === true))}
            >
              {category.name}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
