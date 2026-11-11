import {
  SECTION_TABLE_BODY_ROW_CLASS,
  SECTION_TABLE_CLASS,
  SECTION_TABLE_CONTAINER_CLASS,
  SECTION_TABLE_HEAD_CELL_CLASS_LEFT,
  SECTION_TABLE_HEAD_CELL_CLASS_RIGHT,
  SECTION_TABLE_HEAD_ROW_CLASS,
} from "~/components/event-detail/detail-sections/sections/tableStyles"
import type { BeverageTemplateFields } from "~/definitions/database"
import type { BeverageMenuGroup } from "~/lib/beverageMenu/beverageMenu"
import { getRecordRenderKey } from "~/lib/data/optimisticIds"

import { BeverageMenuRow } from "./BeverageMenuRow"

type BeverageMenuTypeTableProps = {
  group: BeverageMenuGroup
  /** Render keys (getRecordRenderKey) of rows whose note is open. */
  expandedNoteIds: ReadonlySet<string>
  onToggleNotes: (renderKey: string) => void
  onUpdate: (id: string, updates: Partial<BeverageTemplateFields>) => void
  onRemove: (id: string) => void
}

/** The saved beverages of one type, laid out like the event's Drinks table. */
export const BeverageMenuTypeTable: React.FC<BeverageMenuTypeTableProps> = ({
  group,
  expandedNoteIds,
  onToggleNotes,
  onUpdate,
  onRemove,
}) => (
  <div className="space-y-2">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.type}</h4>
    <div className={SECTION_TABLE_CONTAINER_CLASS}>
      <table className={`${SECTION_TABLE_CLASS} table-fixed`}>
        <colgroup>
          <col />
          <col className="w-24" />
          <col className="w-32" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className={SECTION_TABLE_HEAD_ROW_CLASS}>
            <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Item</th>
            <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Price</th>
            <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_LEFT} whitespace-nowrap`}>Pricing</th>
            <th className={`${SECTION_TABLE_HEAD_CELL_CLASS_RIGHT} whitespace-nowrap`}>Remove</th>
          </tr>
        </thead>
        <tbody>
          {group.templates.length === 0 ? (
            <tr className={SECTION_TABLE_BODY_ROW_CLASS}>
              <td colSpan={4} className="px-1.5 py-3 text-xs text-muted-foreground">
                No saved {group.type.toLowerCase()} items yet.
              </td>
            </tr>
          ) : (
            group.templates.map((template) => {
              const renderKey = getRecordRenderKey(template.id)
              return (
                <BeverageMenuRow
                  key={renderKey}
                  template={template}
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
  </div>
)
