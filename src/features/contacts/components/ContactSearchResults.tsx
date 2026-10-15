import { Check, UserPlus } from "lucide-react"

import type { ContactWithRoles } from "~/definitions/contacts"
import { cn } from "~/lib/utils"

import { ContactResultSummary } from "./ContactResultSummary"
import { ContactSearchStatus } from "./ContactSearchStatus"

type ContactSearchResultsProps = {
  contacts: ContactWithRoles[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  hasQuery: boolean
  isAssigned: (contactId: string) => boolean
  disabled: boolean
  onSelect: (contact: ContactWithRoles) => void
}

export const ContactSearchResults: React.FC<ContactSearchResultsProps> = ({
  contacts,
  isLoading,
  isError,
  onRetry,
  hasQuery,
  isAssigned,
  disabled,
  onSelect,
}) => {
  if (isError || contacts.length === 0) {
    return (
      <ContactSearchStatus
        isLoading={isLoading}
        isError={isError}
        hasResults={contacts.length > 0}
        onRetry={onRetry}
        emptyMessage={hasQuery ? "No matching contacts. Create a new one below." : "Your contact directory is empty."}
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {contacts.map((contact) => {
        const assigned = isAssigned(contact.id)

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
              <ContactResultSummary contact={contact} />
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
