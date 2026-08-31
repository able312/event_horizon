import { useParams, useSearchParams } from "react-router"

import { Panel } from "~/components/layouts/SplitLayout"
import { useEvent } from "~/hooks/useEvent"
import { formatDate } from "~/lib/formatters"
import {
  PREVIEW_TYPES,
  resolvePreviewType,
} from "~/features/preview/lib/previewTypes"
import { cn } from "~/lib/utils"

const PreviewPanelOrchestrator: React.FC = () => {
  const { id: eventId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: event } = useEvent()
  const activeType = resolvePreviewType(searchParams)

  const handleSelectType = (typeId: typeof PREVIEW_TYPES[number]["id"]) => {
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
        <div className="px-3 py-4">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-stone-400">
            Preview Type
          </h3>
          <div className="space-y-1">
            {PREVIEW_TYPES.map(({ id, label, icon: Icon }) => {
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
        </div>
      </Panel.Content>
    </>
  )
}

export default PreviewPanelOrchestrator
