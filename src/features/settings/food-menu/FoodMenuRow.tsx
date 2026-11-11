import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import type { FoodMenuCategory, FoodTemplate, FoodTemplateFields, PricingBasis } from "~/definitions/database"
import { ITER_PRICING_BASIS, PRICING_BASIS_LABELS } from "~/definitions/sections/section-constants"
import { PlanningTimeblockItemNoteTabsRow } from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningTimeblockItemNoteTabsRow"
import type { WorkspaceItemBase } from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningWorkspaceTimeblockList"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"

import { MenuRowActions } from "../components/MenuRowActions"
import { formatMenuPrice, MENU_CELL_INPUT_CLASS, parseMenuPrice } from "../lib/menuPrice"
import { FoodMenuCategoryPicker } from "./FoodMenuCategoryPicker"

export const FOOD_MENU_COLUMN_COUNT = 5

type FoodMenuRowProps = {
  template: FoodTemplate
  categories: readonly FoodMenuCategory[]
  notesExpanded: boolean
  onToggleNotes: () => void
  onUpdate: (updates: Partial<FoodTemplateFields>) => void
  onRemove: () => void
}

/** A blank note is stored as no note. */
function noteValue(value: string | null | undefined): string | null {
  return value?.trim() ? value : null
}

/** One saved food item: title, cost, pricing, categories and its client / kitchen notes, saved on blur. */
export const FoodMenuRow: React.FC<FoodMenuRowProps> = ({
  template,
  categories,
  notesExpanded,
  onToggleNotes,
  onUpdate,
  onRemove,
}) => {
  const hasNotes = Boolean(template.clientNotes?.trim() || template.internalNotes?.trim())
  const label = template.name.trim() || "food item"

  // The note tabs are shared with event food items, which send their own update shape.
  const saveNote = ({ updates }: { updates: Partial<WorkspaceItemBase> }) => {
    if ("clientNotes" in updates) onUpdate({ clientNotes: noteValue(updates.clientNotes) })
    if ("internalNotes" in updates) onUpdate({ internalNotes: noteValue(updates.internalNotes) })
  }

  return (
    <>
      <tr className={SECTION_TABLE_BODY_ROW_CLASS} data-food-template-id={getRecordRenderKey(template.id)}>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0`}>
          <input
            // Keyed by the stored value so a save from another window refreshes the field
            key={template.name}
            data-cell="name"
            type="text"
            defaultValue={template.name}
            placeholder="Item title"
            aria-label="Food item title"
            onBlur={(e) => {
              if (e.target.value !== template.name) onUpdate({ name: e.target.value })
            }}
            className={`${MENU_CELL_INPUT_CLASS} truncate`}
          />
        </td>
        <td className={SECTION_TABLE_BODY_CELL_CLASS}>
          <input
            key={template.unitPriceCents ?? "none"}
            type="text"
            inputMode="decimal"
            defaultValue={formatMenuPrice(template.unitPriceCents)}
            placeholder="0.00"
            aria-label={`${label} cost`}
            onBlur={(e) => {
              const unitPriceCents = parseMenuPrice(e.target.value)
              if (unitPriceCents !== undefined && unitPriceCents !== template.unitPriceCents) {
                onUpdate({ unitPriceCents })
              } else {
                e.target.value = formatMenuPrice(template.unitPriceCents)
              }
            }}
            className={`${MENU_CELL_INPUT_CLASS} text-right`}
          />
        </td>
        <td className={SECTION_TABLE_BODY_CELL_CLASS}>
          <select
            value={template.pricingBasis}
            aria-label={`${label} pricing`}
            onChange={(e) => onUpdate({ pricingBasis: e.target.value as PricingBasis })}
            className={MENU_CELL_INPUT_CLASS}
          >
            {ITER_PRICING_BASIS.map((basis) => (
              <option key={basis} value={basis}>
                {PRICING_BASIS_LABELS[basis]}
              </option>
            ))}
          </select>
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0`}>
          <FoodMenuCategoryPicker
            categories={categories}
            selectedIds={template.categoryIds}
            itemLabel={label}
            onChange={(categoryIds) => onUpdate({ categoryIds })}
          />
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
          <MenuRowActions
            label={label}
            hasNotes={hasNotes}
            notesExpanded={notesExpanded}
            onToggleNotes={onToggleNotes}
            onRemove={onRemove}
          />
        </td>
      </tr>
      {notesExpanded ? (
        <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
          <td colSpan={FOOD_MENU_COLUMN_COUNT} className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0`}>
            <PlanningTimeblockItemNoteTabsRow
              timeblockID=""
              itemID={template.id}
              clientNote={template.clientNotes ?? ""}
              internalNote={template.internalNotes ?? ""}
              updateItem={saveNote}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
