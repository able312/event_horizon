import { useParams, useSearchParams } from "react-router"

import { Panel } from "~/components/layouts/SplitLayout"
import { useEvent } from "~/hooks/useEvent"
import {
  getPreviewTypesForEvent,
  resolvePreviewType,
  type PreviewTypeId,
} from "~/features/preview/lib/previewTypes"
import { BeoOptions } from "~/features/preview/panels/options/BeoOptions"
import { FinancialOptions } from "~/features/preview/panels/options/FinancialOptions"
import { FoodBeoOptions } from "~/features/preview/panels/options/FoodBeoOptions"
import { TimelineOptions } from "~/features/preview/panels/options/TimelineOptions"
import { PreviewOptionSection } from "~/features/preview/panels/PreviewOptionControls"
import { usePreviewPreferenceDefaults } from "~/features/preview/preferences/usePreviewPreferenceDefaults"
import { formatDate } from "~/lib/formatters"
import { cn } from "~/lib/utils"

const PreviewPanelOrchestrator: React.FC = () => {
  const { id: eventId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: event } = useEvent()
  const activeType = resolvePreviewType(searchParams)
  const availablePreviewTypes = getPreviewTypesForEvent(event?.type)

  usePreviewPreferenceDefaults()

  const handleSelectType = (typeId: PreviewTypeId) => {
    if (!eventId) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("type", typeId)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <Panel.Header>
        <div className="flex w-full min-w-0 flex-col gap-0.5 px-1 py-1">
          <p className="truncate text-sm font-semibold text-stone-100">
            {event?.title ?? "Preview"}
          </p>
          {event?.startDateTime ? (
            <p className="truncate text-xs text-stone-400">
              {formatDate(event.startDateTime)}
            </p>
          ) : (
            <p className="text-xs text-stone-500">No event date set</p>
          )}
        </div>
      </Panel.Header>

      <Panel.Content>
        <div className="space-y-6 px-3 py-4">
          <PreviewOptionSection title="Preview Type">
            <div className="space-y-1">
              {availablePreviewTypes.map(({ id, label, icon: Icon }) => {
                const isActive = activeType === id

                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleSelectType(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-white/10 text-stone-100"
                        : "text-stone-300 hover:bg-white/5 hover:text-stone-100",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </div>
          </PreviewOptionSection>

          {activeType === "beo" ? <BeoOptions /> : null}
          {activeType === "beo-food" ? <FoodBeoOptions /> : null}
          {activeType === "timeline" ? <TimelineOptions /> : null}
          {activeType === "financial-report" ? <FinancialOptions /> : null}
        </div>
      </Panel.Content>
    </>
  )
}

export default PreviewPanelOrchestrator
