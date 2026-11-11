import type { PricingBasis } from "~/definitions/database"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"

type SavedMenuItemLabelProps = {
  item: { name: string; unitPriceCents: number | null; pricingBasis: PricingBasis }
}

/** A saved menu item in an "Add Item" dropdown: its name, then its price ("/ person" when priced per person). */
export const SavedMenuItemLabel: React.FC<SavedMenuItemLabelProps> = ({ item }) => (
  <>
    <span className="mr-auto truncate">{item.name}</span>
    {item.unitPriceCents != null ? (
      <span className="shrink-0 text-xs text-muted-foreground">
        {toCurrency(item.unitPriceCents)}
        {item.pricingBasis === "per_person" ? " / person" : ""}
      </span>
    ) : null}
  </>
)
