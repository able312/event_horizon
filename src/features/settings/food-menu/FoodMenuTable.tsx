import {
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import type { FoodMenuCategory, FoodTemplate, FoodTemplateFields } from "~/definitions/database"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"

import { FOOD_MENU_COLUMN_COUNT, FoodMenuRow } from "./FoodMenuRow"

type FoodMenuTableProps = {
  templates: readonly FoodTemplate[]
  /** All categories, already sorted. */
  categories: readonly FoodMenuCategory[]
  emptyCopy: string
  /** Render keys (getRecordRenderKey) of rows whose notes are open. */
  expandedNoteIds: ReadonlySet<string>
  onToggleNotes: (renderKey: string) => void
  onUpdate: (id: string, updates: Partial<FoodTemplateFields>) => void
  onRemove: (id: string) => void
}

/** The saved food items, laid out like the event's food tables. */
export const FoodMenuTable: React.FC<FoodMenuTableProps> = ({
  templates,
  categories,
  emptyCopy,
  expandedNoteIds,
  onToggleNotes,
  onUpdate,
  onRemove,
}) => (
  <div className={SECTION_TABLE_CONTAINER_CLASS}>
    <table className={`${SECTION_TABLE_CLASS} table-fixed`}>
      <colgroup>
        <col />
        <col className="w-24" />
        <col className="w-28" />
        <col className="w-40" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
          <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Title</th>
          <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Cost</th>
          <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Pricing</th>
          <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Categories</th>
          <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Remove</th>
        </tr>
      </thead>
      <tbody>
        {templates.length === 0 ? (
          <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
            <td colSpan={FOOD_MENU_COLUMN_COUNT} className="px-1.5 py-3 text-xs text-muted-foreground">
              {emptyCopy}
            </td>
          </tr>
        ) : (
          templates.map((template) => {
            const renderKey = getRecordRenderKey(template.id)
            return (
              <FoodMenuRow
                key={renderKey}
                template={template}
                categories={categories}
                notesExpanded={expandedNoteIds.has(renderKey)}
                onToggleNotes={() => onToggleNotes(renderKey)}
                onUpdate={(updates) => onUpdate(template.id, updates)}
                onRemove={() => onRemove(template.id)}
              />
            )
          })
        )}
      </tbody>
    </table>
  </div>
)
