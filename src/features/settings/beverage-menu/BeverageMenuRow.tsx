import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import type { BeverageTemplate, BeverageTemplateFields, PricingBasis } from "~/definitions/database"
import { ITER_PRICING_BASIS, PRICING_BASIS_LABELS } from "~/definitions/sections/section-constants"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"
import { PlanningTimeblockItemNoteRow } from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningTimeblockItemNoteRow"

import { MenuRowActions } from "../components/MenuRowActions"
import { formatMenuPrice, MENU_CELL_INPUT_CLASS as CELL_INPUT_CLASS, parseMenuPrice } from "../lib/menuPrice"

type BeverageMenuRowProps = {
  template: BeverageTemplate
  notesExpanded: boolean
  onToggleNotes: () => void
  onUpdate: (updates: Partial<BeverageTemplateFields>) => void
  onRemove: () => void
}

/** One saved beverage: name, price, pricing basis and an expandable note, saved on blur. */
export const BeverageMenuRow: React.FC<BeverageMenuRowProps> = ({
  template,
  notesExpanded,
  onToggleNotes,
  onUpdate,
  onRemove,
}) => {
  const hasNotes = Boolean(template.notes?.trim())
  const label = template.name.trim() || "beverage"

  return (
    <>
      <tr className={SECTION_TABLE_BODY_ROW_CLASS} data-beverage-template-id={getRecordRenderKey(template.id)}>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0`}>
          <input
            // Keyed by the stored value so a save from another window refreshes the field
            key={template.name}
            data-cell="name"
            type="text"
            defaultValue={template.name}
            placeholder="Item name"
            aria-label="Beverage name"
            onBlur={(e) => {
              if (e.target.value !== template.name) onUpdate({ name: e.target.value })
            }}
            className={`${CELL_INPUT_CLASS} truncate`}
          />
        </td>
        <td className={SECTION_TABLE_BODY_CELL_CLASS}>
          <input
            key={template.unitPriceCents ?? "none"}
            type="text"
            inputMode="decimal"
            defaultValue={formatMenuPrice(template.unitPriceCents)}
            placeholder="0.00"
            aria-label={`${label} price`}
            onBlur={(e) => {
              const unitPriceCents = parseMenuPrice(e.target.value)
              if (unitPriceCents !== undefined && unitPriceCents !== template.unitPriceCents) {
                onUpdate({ unitPriceCents })
              } else {
                e.target.value = formatMenuPrice(template.unitPriceCents)
              }
            }}
            className={`${CELL_INPUT_CLASS} text-right`}
          />
        </td>
        <td className={SECTION_TABLE_BODY_CELL_CLASS}>
          <select
            value={template.pricingBasis}
            aria-label={`${label} pricing`}
            onChange={(e) => onUpdate({ pricingBasis: e.target.value as PricingBasis })}
            className={CELL_INPUT_CLASS}
          >
            {ITER_PRICING_BASIS.map((basis) => (
              <option key={basis} value={basis}>
                {PRICING_BASIS_LABELS[basis]}
              </option>
            ))}
          </select>
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
          <td colSpan={4} className={`${SECTION_TABLE_BODY_CELL_CLASS} min-w-0`}>
            <PlanningTimeblockItemNoteRow
              note={template.notes ?? ""}
              onSave={(notes) => onUpdate({ notes: notes.trim() ? notes : null })}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
