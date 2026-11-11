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
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { useBeverageTemplates } from "~/hooks/useBeverageTemplates"
import { groupBeverageMenu } from "~/lib/beverageMenu/beverageMenu"

type BeverageAddItemMenuItemsProps = {
  /** Adds a blank item of this type. */
  onAddBlank: (type: BeverageItemType) => void
  /** Adds an item filled in from a saved beverage. */
  onAddFromMenu: (template: BeverageTemplate) => void
}

/**
 * The items of a beverage "Add Item" dropdown: a blank item of any type, then the
 * saved beverages (Settings → Beverage Menu) grouped by type.
 */
export const BeverageAddItemMenuItems: React.FC<BeverageAddItemMenuItemsProps> = ({ onAddBlank, onAddFromMenu }) => {
  const { templates, isLoading, isError } = useBeverageTemplates()
  const groups = groupBeverageMenu(templates.filter((template) => template.name.trim()))

  return (
    <>
      <DropdownMenuLabel>Blank item</DropdownMenuLabel>
      {ITER_BEVERAGE_TYPE.map((type) => (
        <DropdownMenuItem key={type} onClick={() => onAddBlank(type)}>
          {type}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>From beverage menu</DropdownMenuLabel>
      {isLoading ? <DropdownMenuItem disabled>Loading…</DropdownMenuItem> : null}
      {isError ? <DropdownMenuItem disabled>Could not load the beverage menu</DropdownMenuItem> : null}
      {!isLoading && !isError && groups.length === 0 ? (
        <DropdownMenuItem disabled>Nothing saved yet (Settings → Beverage Menu)</DropdownMenuItem>
      ) : null}
      {groups.map((group) => (
        <DropdownMenuSub key={group.type}>
          <DropdownMenuSubTrigger>{group.type}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56">
            {group.templates.map((template) => (
              <DropdownMenuItem key={template.id} onClick={() => onAddFromMenu(template)}>
                <span className="mr-auto truncate">{template.name}</span>
                {template.unitPriceCents != null ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {toCurrency(template.unitPriceCents)}
                    {template.pricingBasis === "per_person" ? " / person" : ""}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
    </>
  )
}
