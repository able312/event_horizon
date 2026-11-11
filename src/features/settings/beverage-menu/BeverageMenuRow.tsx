import { Info, Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import {
  SECTION_TABLE_BODY_CELL_CLASS,
  SECTION_TABLE_BODY_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import type { BeverageTemplate, BeverageTemplateFields, PricingBasis } from "~/definitions/database"
import { PRICING_BASES } from "~/definitions/enums"
import { PRICING_BASIS_LABELS } from "~/lib/beverageMenu/beverageMenu"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"
import { PlanningTimeblockItemNoteRow } from "~/features/event-detail/sections/food-beverage-workspaces/PlanningWorkspaceTimeblocks/PlanningTimeblockItemNoteRow"

import { formatMenuPrice, parseMenuPrice } from "./beverageMenuPrice"

const CELL_INPUT_CLASS =
  "h-7 w-full min-w-0 border-0 border-b border-border bg-transparent px-1 text-xs focus:border-primary focus:outline-none"

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
              if (unitPriceCents !== template.unitPriceCents) onUpdate({ unitPriceCents })
              else e.target.value = formatMenuPrice(unitPriceCents)
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
            {PRICING_BASES.map((basis) => (
              <option key={basis} value={basis}>
                {PRICING_BASIS_LABELS[basis]}
              </option>
            ))}
          </select>
        </td>
        <td className={`${SECTION_TABLE_BODY_CELL_CLASS} text-right`}>
          <div className="inline-flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleNotes}
              aria-label={notesExpanded ? "Hide note" : "Show note"}
              aria-pressed={notesExpanded}
              className={`h-8 px-2 ${
                notesExpanded || hasNotes
                  ? "text-orange-600 hover:text-orange-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Info />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label={`Delete ${label}`}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
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
