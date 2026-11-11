import { useState } from "react"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { Skeleton } from "~/components/atoms/skeleton"
import type { BeverageItemType } from "~/definitions/database"
import { BeverageAddItemButton } from "~/features/event-detail/sections/food-beverage-workspaces/beverage/BeverageAddItemButton"
import { useBeverageTemplates } from "~/hooks/useBeverageTemplates"
import { usePendingRowFocus } from "~/hooks/usePendingRowFocus"
import { groupBeverageMenu } from "~/lib/beverageMenu/beverageMenu"

import { SettingsSection } from "../components/SettingsSection"
import { BeverageMenuTypeTable } from "./BeverageMenuTypeTable"

function findTemplateNameInput(clientId: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(`[data-beverage-template-id="${clientId}"] [data-cell="name"]`)
}

/** Settings → Beverage Menu: the venue's saved beverages, ready to add to any event. */
export const BeverageMenuSettings: React.FC = () => {
  const { templates, isLoading, isError, isFetching, refetch, addTemplate, updateTemplate, removeTemplate } =
    useBeverageTemplates()
  const [expandedNoteIds, setExpandedNoteIds] = useState<ReadonlySet<string>>(() => new Set())
  const focusNewTemplateName = usePendingRowFocus(findTemplateNameInput, templates)

  const handleAdd = (type: BeverageItemType) => {
    const id = crypto.randomUUID()
    focusNewTemplateName(id)
    addTemplate({ id, type })
  }

  const toggleNotes = (renderKey: string) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev)
      if (next.has(renderKey)) next.delete(renderKey)
      else next.add(renderKey)
      return next
    })
  }

  if (isError) {
    return (
      <RouteBlockingError
        title="Could not load the beverage menu"
        description="The saved beverages are temporarily unavailable. Please retry."
        onRetry={async () => {
          await refetch()
        }}
        isRetrying={isFetching}
      />
    )
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <SettingsSection
      title="Drinks"
      description="Changes here apply to beverages added from now on. Events that already have an item keep their own copy."
    >
      <div className="flex justify-end">
        <BeverageAddItemButton onAddBlank={handleAdd} labelWithType />
      </div>
      <div className="space-y-4">
        {groupBeverageMenu(templates, { includeEmpty: true }).map((group) => (
          <BeverageMenuTypeTable
            key={group.type}
            group={group}
            expandedNoteIds={expandedNoteIds}
            onToggleNotes={toggleNotes}
            onUpdate={(id, updates) => updateTemplate({ id, updates })}
            onRemove={removeTemplate}
          />
        ))}
      </div>
    </SettingsSection>
  )
}
