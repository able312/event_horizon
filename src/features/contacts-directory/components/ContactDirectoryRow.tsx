import type { ContactWithRoles } from "~/definitions/contacts"
import { describeStandingRoles } from "~/features/contacts/lib/eventContactsPanel"
import { deriveInitials } from "~/lib/contacts/contactRules"
import { cn } from "~/lib/utils"

type ContactDirectoryRowProps = {
  contact: ContactWithRoles
  selected: boolean
  onSelect: (contact: ContactWithRoles) => void
}

export const ContactDirectoryRow: React.FC<ContactDirectoryRowProps> = ({ contact, selected, onSelect }) => {
  const details = [contact.email, contact.phone].filter(Boolean).join(" · ")
  const roles = describeStandingRoles(contact)

  return (
    <li>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 px-2 py-2 text-left transition-colors",
          selected ? "bg-white/10" : "hover:bg-white/5",
        )}
        onClick={() => onSelect(contact)}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-700 text-[11px] font-bold tracking-tight text-stone-100">
          {deriveInitials(contact.displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-stone-100">{contact.displayName}</span>
            {contact.archivedAt ? (
              <span className="shrink-0 rounded-xs bg-stone-700 px-1.5 text-[10px] uppercase tracking-wide text-stone-300">
                Archived
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-stone-400">
            {details || "No email or phone"}
            {roles ? <span className="text-stone-500"> · {roles}</span> : null}
          </span>
        </span>
      </button>
    </li>
  )
}
