import { useState } from "react"
import { Copy, Mail, MoreVertical, Pencil, Search, Star, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import type { ContactRoleType, EventContactsPanelItem } from "~/definitions/contacts"
import { buildGmailComposeUrl, buildGmailSearchUrl } from "~/lib/gmailUrlConstructors"
import { openExternalUrl } from "~/lib/ipc/system"
import { cn } from "~/lib/utils"

import { getSwatch } from "../lib/contactStyles"
import { describeAssignment, formatContactPlainText } from "../lib/eventContactsPanel"
import { ContactAvatar } from "./ContactAvatar"

type EventContactRowProps = {
  role: ContactRoleType
  item: EventContactsPanelItem
  eventTitle: string
  selected: boolean
  onToggleSelected: () => void
  onEdit: () => void
  onSetPrimary: () => void
  onRemove: () => void
}

const ICON_BUTTON_CLASS = "size-7 rounded-full text-muted-foreground hover:text-orange-500"

async function openInGmail(url: () => string) {
  try {
    await openExternalUrl(url())
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to open Gmail")
  }
}

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error("Failed to copy to clipboard")
  }
}

export const EventContactRow: React.FC<EventContactRowProps> = ({
  role,
  item,
  eventTitle,
  selected,
  onToggleSelected,
  onEdit,
  onSetPrimary,
  onRemove,
}) => {
  const [expanded, setExpanded] = useState(false)
  const email = item.email

  return (
    <li className={cn("group py-2 transition-colors", selected && "bg-orange-50/50")}>
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          className="size-3.5 shrink-0 cursor-pointer accent-orange-500"
          checked={selected}
          aria-label={`Select ${item.displayName}`}
          onChange={onToggleSelected}
        />
        <ContactAvatar initials={item.initials} role={role} vendorCategory={item.vendorCategory} />

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold tracking-wide group-hover:underline">
              {item.displayName}
            </span>
            {item.isPrimary ? (
              <Star className="size-3 shrink-0 fill-orange-400 text-orange-400" aria-label="Primary contact" />
            ) : null}
            {item.contactArchived ? (
              <span className="shrink-0 rounded-xs bg-stone-100 px-1.5 text-[10px] uppercase tracking-wide text-stone-500">
                Archived
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {role === "vendor" && item.vendorCategory ? (
              <span
                className={cn(
                  "shrink-0 rounded-xs px-1.5 font-medium",
                  getSwatch(item.vendorCategory.colorToken).badge,
                )}
              >
                {item.vendorCategory.label}
              </span>
            ) : null}
            {role !== "vendor" || item.roleLabel ? (
              <span className="truncate">{describeAssignment(role, item)}</span>
            ) : null}
          </span>
        </button>

        <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            aria-label={`Email ${item.displayName}`}
            title={email ?? "No email on file"}
            disabled={!email}
            onClick={() => void openInGmail(() => buildGmailComposeUrl(email!, `Attn: ${eventTitle}`))}
          >
            <Mail className="size-3.5" />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
                aria-label={`Actions for ${item.displayName}`}
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" /> Edit contact
              </DropdownMenuItem>
              <DropdownMenuItem disabled={item.isPrimary} onClick={onSetPrimary}>
                <Star className="size-4" /> {item.isPrimary ? "Primary contact" : "Make primary"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void copyToClipboard(formatContactPlainText(role, item), "Contact details copied")}
              >
                <Copy className="size-4" /> Copy details
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!email} onClick={() => void openInGmail(() => buildGmailSearchUrl(email!))}>
                <Search className="size-4" /> Search Gmail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <UserMinus className="size-4" /> Remove from event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded ? (
        <dl className="mt-2 ml-[4.25rem] grid gap-1.5 border-l-2 border-border pl-3">
          <ContactDetail label="Email" value={item.email} />
          <ContactDetail label="Phone" value={item.phone} />
        </dl>
      ) : null}
    </li>
  )
}

const ContactDetail: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <dt className="w-12 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="flex min-w-0 items-center gap-1 text-sm">
      {value ? (
        <>
          <span className="truncate select-text">{value}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-orange-500"
            aria-label={`Copy ${label.toLowerCase()}`}
            onClick={() => void copyToClipboard(value, `${value} copied to clipboard`)}
          >
            <Copy className="size-3" />
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </dd>
  </div>
)
