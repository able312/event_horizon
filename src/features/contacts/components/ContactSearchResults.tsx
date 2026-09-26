import { Check, UserPlus } from "lucide-react"

import type { ContactWithRoles } from "~/definitions/contacts"
import { deriveInitials } from "~/lib/contacts/contactRules"
import { cn } from "~/lib/utils"

import { describeStandingRoles } from "../lib/eventContactsPanel"

type ContactSearchResultsProps = {
  contacts: ContactWithRoles[]
  isLoading: boolean
  hasQuery: boolean
  isAssigned: (contactId: string) => boolean
  disabled: boolean
  onSelect: (contact: ContactWithRoles) => void
}

export const ContactSearchResults: React.FC<ContactSearchResultsProps> = ({
  contacts,
  isLoading,
  hasQuery,
  isAssigned,
  disabled,
  onSelect,
}) => {
  if (isLoading && contacts.length === 0) {
    return <p className="px-2 py-6 text-center text-xs text-muted-foreground">Searching contacts…</p>
  }

  if (contacts.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
        {hasQuery ? "No matching contacts. Create a new one below." : "Your contact directory is empty."}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {contacts.map((contact) => {
        const assigned = isAssigned(contact.id)
        const details = [contact.email, contact.phone].filter(Boolean).join(" · ")
        const roles = describeStandingRoles(contact)

        return (
          <li key={contact.id}>
            <button
              type="button"
              disabled={disabled || assigned}
              className={cn(
                "group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors",
                assigned ? "cursor-default opacity-60" : "hover:bg-accent",
              )}
              onClick={() => onSelect(contact)}
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold tracking-tight text-stone-700">
                {deriveInitials(contact.displayName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{contact.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {details || "No email or phone"}
                  {roles ? <span className="text-muted-foreground/70"> · {roles}</span> : null}
                </span>
              </span>
              {assigned ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3.5" /> Added
                </span>
              ) : (
                <UserPlus className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-orange-500" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
