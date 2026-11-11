import { useState } from "react"

import { SplitAddButton } from "~/components/molecules/SplitAddButton"
import type { BeverageItemType, BeverageTemplate } from "~/definitions/database"

import { BeverageAddItemMenuItems } from "./BeverageAddItemMenuItems"

type BeverageAddItemButtonProps = {
  /** Adds a blank item of this type. */
  onAddBlank: (type: BeverageItemType) => void
  /** Adds an item from a saved beverage. Left out (Settings), the menu only lists types. */
  onAddFromMenu?: (template: BeverageTemplate) => void
  variant?: "light" | "header"
  disabled?: boolean
  /** Shows the remembered type on the button ("Add Wine") instead of "Add Item". */
  labelWithType?: boolean
}

function typeLabel(type: BeverageItemType): string {
  return type === "Special Orders" ? "Special Order" : type
}

/**
 * The beverage "Add Item ▾" button. The main part adds a blank item of the last type
 * picked from the menu (Beer to start with), so adding several of one type is one click each.
 */
export const BeverageAddItemButton: React.FC<BeverageAddItemButtonProps> = ({
  onAddBlank,
  onAddFromMenu,
  variant,
  disabled,
  labelWithType = false,
}) => {
  const [lastChosenType, setLastChosenType] = useState<BeverageItemType>("Beer")

  const addBlank = (type: BeverageItemType) => {
    setLastChosenType(type)
    onAddBlank(type)
  }

  const addFromMenu = onAddFromMenu
    ? (template: BeverageTemplate) => {
        setLastChosenType(template.type)
        onAddFromMenu(template)
      }
    : undefined

  return (
    <SplitAddButton
      label={labelWithType ? `Add ${typeLabel(lastChosenType)}` : "Add Item"}
      onAdd={() => onAddBlank(lastChosenType)}
      menuLabel={onAddFromMenu ? "Choose beverage type or saved beverage" : "Choose beverage type"}
      variant={variant}
      disabled={disabled}
    >
      <BeverageAddItemMenuItems onAddBlank={addBlank} onAddFromMenu={addFromMenu} />
    </SplitAddButton>
  )
}
