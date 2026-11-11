import { SplitAddButton } from "~/components/molecules/SplitAddButton"
import type { FoodItem, FoodTemplate } from "~/definitions/database"
import { foodMenuItemFields } from "~/lib/foodMenu/foodMenu"

import { FoodAddItemMenuItems } from "./FoodAddItemMenuItems"

type FoodAddItemButtonProps = {
  label: string
  /** Adds an item to the timeblock, blank or with fields copied from a saved food item. */
  onAdd: (newItem?: Partial<FoodItem>) => void
  disabled?: boolean
}

/** A food timeblock's "Add Item ▾": the main part adds a blank item, the menu adds one from the food menu. */
export const FoodAddItemButton: React.FC<FoodAddItemButtonProps> = ({ label, onAdd, disabled }) => {
  const addFromMenu = (template: FoodTemplate) => onAdd(foodMenuItemFields(template))

  return (
    <SplitAddButton
      label={label}
      onAdd={() => onAdd()}
      menuLabel="Add a blank item or one from the food menu"
      variant="header"
      disabled={disabled}
    >
      <FoodAddItemMenuItems onAddBlank={() => onAdd()} onAddFromMenu={addFromMenu} />
    </SplitAddButton>
  )
}
