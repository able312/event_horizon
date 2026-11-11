import type { EventNotification } from "~/definitions/database"
import { EVENT_NOTIFICATION_KIND_LABELS, notificationSummary } from "~/features/event-notifications/lib/eventNotificationText"
import { formatReceivedAt } from "~/features/inbox/lib/inboxList"
import { cn } from "~/lib/utils"

type InboxNotificationCardProps = {
  notification: EventNotification
  selected: boolean
  onSelect: (notification: EventNotification) => void
}

const KIND_CLASSES: Record<EventNotification["kind"], string> = {
  created: "text-emerald-300",
  updated: "text-sky-300",
  deleted: "text-rose-300",
}

/** A teammate's event change in the Inbox sidebar: which event, what happened, and who did it. Unread ones are dotted and bold. */
export const InboxNotificationCard: React.FC<InboxNotificationCardProps> = ({ notification, selected, onSelect }) => (
  <li>
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      className={cn(
        "block w-full border-l-2 px-3 py-2.5 text-left transition-colors",
        selected ? "border-orange-500 bg-white/10" : "border-transparent hover:bg-white/5",
      )}
      onClick={() => onSelect(notification)}
    >
      <span className="flex items-baseline gap-2">
        {notification.read ? null : (
          <span aria-label="Unread" className="size-2 shrink-0 translate-y-[-1px] self-center rounded-full bg-orange-500" />
        )}
        <span className={cn("min-w-0 flex-1 truncate text-sm text-stone-100", notification.read ? "font-normal" : "font-semibold")}>
          {notification.eventTitle || "Untitled event"}
        </span>
        <span className="shrink-0 text-[11px] text-stone-400">{formatReceivedAt(notification.updatedAt)}</span>
      </span>
      <span className="block truncate text-xs text-stone-300">
        <span className={KIND_CLASSES[notification.kind]}>{EVENT_NOTIFICATION_KIND_LABELS[notification.kind]}</span>
        {" · "}
        {notificationSummary(notification)}
      </span>
      <span className="block truncate text-xs text-stone-400">by {notification.actorName ?? "a teammate"}</span>
    </button>
  </li>
)
