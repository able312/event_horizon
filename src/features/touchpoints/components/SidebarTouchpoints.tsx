import { useMemo, useState } from "react"
import { Link, useLocation } from "react-router"

import { buildEventDetailEntryPath } from "~/features/event-detail/workspace/lib/eventDetailRouteState"
import { useIncompleteTouchpoints } from "~/hooks/useTouchpointsSection"

import {
  groupSidebarTouchpoints,
  visibleSidebarItems,
  type SidebarTouchpointSectionKey,
} from "../lib/groupSidebarTouchpoints"
import { parseStoredDueDate } from "../lib/touchpointStatus"

export const SidebarTouchpoints: React.FC = () => {
  const location = useLocation()
  const { data = [], isLoading } = useIncompleteTouchpoints()
  const [expanded, setExpanded] = useState<Partial<Record<SidebarTouchpointSectionKey, boolean>>>(
    {},
  )

  const sections = useMemo(() => groupSidebarTouchpoints(data), [data])
  const returnTo = `${location.pathname}${location.search}`

  if (isLoading || sections.length === 0) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 px-3 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        Touchpoints
      </h3>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {sections.map((section) => {
          const isExpanded = Boolean(expanded[section.key])
          const { visible, hiddenCount } = visibleSidebarItems(section, isExpanded)

          return (
            <section key={section.key}>
              <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                {section.label}
              </h4>
              <ul className="space-y-1">
                {visible.map((item) => {
                  const due = parseStoredDueDate(item.dueDate)
                  return (
                    <li key={item.id}>
                      <Link
                        to={buildEventDetailEntryPath(item.eventId, returnTo)}
                        className="block rounded-sm px-1.5 py-1.5 transition-colors hover:bg-white/5"
                      >
                        <p className="truncate text-sm text-stone-100">
                          {item.title.trim() || "Untitled touchpoint"}
                        </p>
                        <p className="truncate text-xs text-stone-400">
                          {item.eventTitle}
                          {due ? ` · ${due.toLocaleDateString()}` : ""}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className="mt-1 text-xs text-orange-400 hover:text-orange-300"
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [section.key]: true }))
                  }
                >
                  +{hiddenCount} more
                </button>
              ) : null}
              {isExpanded && section.items.length > section.cap ? (
                <button
                  type="button"
                  className="mt-1 block text-xs text-stone-500 hover:text-stone-300"
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [section.key]: false }))
                  }
                >
                  Show less
                </button>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
