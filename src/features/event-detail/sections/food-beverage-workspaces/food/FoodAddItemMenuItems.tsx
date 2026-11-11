import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "~/components/atoms/dropdown-menu"
import type { FoodTemplate } from "~/definitions/database"
import { useFoodMenuCategories, useFoodTemplates } from "~/hooks/useFoodTemplates"
import { groupFoodMenu } from "~/lib/foodMenu/foodMenu"

import { SavedMenuItemLabel } from "../SavedMenuItemLabel"

const UNCATEGORIZED_LABEL = "No category"

type FoodAddItemMenuItemsProps = {
  onAddBlank: () => void
  /** Adds an item filled in from a saved food item. */
  onAddFromMenu: (template: FoodTemplate) => void
}

/**
 * The items of a food "Add Item" dropdown: a blank item, then the saved food items
 * (Settings → Food Menu) grouped by category.
 */
export const FoodAddItemMenuItems: React.FC<FoodAddItemMenuItemsProps> = ({ onAddBlank, onAddFromMenu }) => (
  <>
    <DropdownMenuItem onClick={onAddBlank}>Blank item</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuLabel>From food menu</DropdownMenuLabel>
    <SavedFoodItems onAddFromMenu={onAddFromMenu} />
  </>
)

const SavedFoodItems: React.FC<{ onAddFromMenu: (template: FoodTemplate) => void }> = ({ onAddFromMenu }) => {
  const templatesQuery = useFoodTemplates()
  const categoriesQuery = useFoodMenuCategories()
  const isLoading = templatesQuery.isLoading || categoriesQuery.isLoading
  const isError = templatesQuery.isError || categoriesQuery.isError
  const named = templatesQuery.templates.filter((template) => template.name.trim())
  const groups = groupFoodMenu(named, categoriesQuery.categories)

  if (isLoading) return <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
  if (isError) return <DropdownMenuItem disabled>Could not load the food menu</DropdownMenuItem>
  if (groups.length === 0) return <DropdownMenuItem disabled>Nothing saved yet (Settings → Food Menu)</DropdownMenuItem>

  const renderItems = (templates: FoodTemplate[]) => templates.map((template) => (
    <DropdownMenuItem key={template.id} onClick={() => onAddFromMenu(template)}>
      <SavedMenuItemLabel item={template} />
    </DropdownMenuItem>
  ))

  // Nothing is categorized yet: list the items directly rather than one lone submenu
  if (groups.length === 1 && !groups[0].category) return renderItems(groups[0].templates)

  return groups.map((group) => (
    <DropdownMenuSub key={group.category?.id ?? "none"}>
      <DropdownMenuSubTrigger>{group.category?.name ?? UNCATEGORIZED_LABEL}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-56">{renderItems(group.templates)}</DropdownMenuSubContent>
    </DropdownMenuSub>
  ))
}
