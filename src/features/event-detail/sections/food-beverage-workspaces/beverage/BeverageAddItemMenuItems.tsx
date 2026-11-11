import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "~/components/atoms/dropdown-menu"
import type { BeverageItemType, BeverageTemplate } from "~/definitions/database"
import { ITER_BEVERAGE_TYPE } from "~/definitions/sections/section-constants"
import { useBeverageTemplates } from "~/hooks/useBeverageTemplates"
import { groupBeverageMenu } from "~/lib/beverageMenu/beverageMenu"

import { SavedMenuItemLabel } from "../SavedMenuItemLabel"

type BeverageAddItemMenuItemsProps = {
  /** Adds a blank item of this type. */
  onAddBlank: (type: BeverageItemType) => void
  /** Adds an item filled in from a saved beverage. Left out, the menu only lists types. */
  onAddFromMenu?: (template: BeverageTemplate) => void
}

/**
 * The items of a beverage "Add Item" dropdown: a blank item of any type, then the
 * saved beverages (Settings → Beverage Menu) grouped by type.
 */
export const BeverageAddItemMenuItems: React.FC<BeverageAddItemMenuItemsProps> = ({ onAddBlank, onAddFromMenu }) => {
  const typeItems = ITER_BEVERAGE_TYPE.map((type) => (
    <DropdownMenuItem key={type} onClick={() => onAddBlank(type)}>
      {type}
    </DropdownMenuItem>
  ))
  if (!onAddFromMenu) return typeItems

  return (
    <>
      <DropdownMenuLabel>Blank item</DropdownMenuLabel>
      {typeItems}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>From beverage menu</DropdownMenuLabel>
      <SavedBeverageItems onAddFromMenu={onAddFromMenu} />
    </>
  )
}

const SavedBeverageItems: React.FC<{ onAddFromMenu: (template: BeverageTemplate) => void }> = ({ onAddFromMenu }) => {
  const { templates, isLoading, isError } = useBeverageTemplates()
  const groups = groupBeverageMenu(templates.filter((template) => template.name.trim()))

  if (isLoading) return <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
  if (isError) return <DropdownMenuItem disabled>Could not load the beverage menu</DropdownMenuItem>
  if (groups.length === 0) return <DropdownMenuItem disabled>Nothing saved yet (Settings → Beverage Menu)</DropdownMenuItem>

  return groups.map((group) => (
    <DropdownMenuSub key={group.type}>
      <DropdownMenuSubTrigger>{group.type}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-56">
        {group.templates.map((template) => (
          <DropdownMenuItem key={template.id} onClick={() => onAddFromMenu(template)}>
            <SavedMenuItemLabel item={template} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  ))
}
