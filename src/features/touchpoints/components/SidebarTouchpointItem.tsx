import { Link } from "react-router"

import type { SidebarTouchpointRow, SidebarTouchpointSectionKey } from "../lib/groupSidebarTouchpoints"
import { formatSidebarDueLabelFromStored } from "../lib/touchpointStatus"

const ACCENT_BY_URGENCY: Record<SidebarTouchpointSectionKey, string> = {
  "due today": "border-orange-400",
  "past due": "border-red-400/70",
  upcoming: "border-stone-500",
}

const DUE_LABEL_BY_URGENCY: Record<SidebarTouchpointSectionKey, string> = {
  "due today": "text-orange-300",
  "past due": "text-red-300/90",
  upcoming: "text-stone-400",
}

const TITLE_BY_URGENCY: Record<SidebarTouchpointSectionKey, string> = {
  "due today": "text-sm font-semibold text-stone-100",
  "past due": "text-sm font-medium text-stone-100",
  upcoming: "text-sm font-medium text-stone-100",
}

type SidebarTouchpointItemProps = {
  item: SidebarTouchpointRow
  to: string
}

export const SidebarTouchpointItem: React.FC<SidebarTouchpointItemProps> = ({ item, to }) => {
  const dueLabel = formatSidebarDueLabelFromStored(item.dueDate)
  const eventName = item.eventTitle.trim() || "Untitled event"

  return (
    <li>
      <Link
        to={to}
        className={`block rounded-none border-l-2 px-1.5 py-1.5 transition-colors hover:bg-white/5 ${ACCENT_BY_URGENCY[item.urgency]}`}
      >
        <p className={`truncate ${TITLE_BY_URGENCY[item.urgency]}`}>
          {item.title.trim() || "Untitled touchpoint"}
        </p>
        <p className="truncate text-xs text-stone-500">
          {dueLabel ? (
            <>
              <span className={DUE_LABEL_BY_URGENCY[item.urgency]}>{dueLabel}</span>
              <span className="text-stone-600"> · </span>
            </>
          ) : null}
          <span>{eventName}</span>
        </p>
      </Link>
    </li>
  )
}
