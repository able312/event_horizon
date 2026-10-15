import type { ContactWithRoles } from "~/definitions/contacts"
import { deriveInitials } from "~/lib/contacts/contactRules"

import { describeStandingRoles } from "../lib/eventContactsPanel"

/** Initials, name, email/phone and standing roles for one contact search result. Adapts to light and dark surfaces. */
export const ContactResultSummary: React.FC<{ contact: ContactWithRoles }> = ({ contact }) => {
  const details = [contact.email, contact.phone].filter(Boolean).join(" · ")
  const roles = describeStandingRoles(contact)

  return (
    <>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold tracking-tight text-stone-700 dark:bg-white/10 dark:text-stone-100">
        {deriveInitials(contact.displayName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{contact.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {details || "No email or phone"}
          {roles ? <span className="text-muted-foreground/70"> · {roles}</span> : null}
        </span>
      </span>
    </>
  )
}
