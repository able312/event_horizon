import { LastEditedBy } from "~/components/molecules/LastEditedBy"
import type { Contact } from "~/definitions/contacts"
import { deriveInitials } from "~/lib/contacts/contactRules"

type ContactProfileSummaryProps = {
  contact: Contact
}

/** The large name/avatar block at the top of the contact detail body. */
export const ContactProfileSummary: React.FC<ContactProfileSummaryProps> = ({ contact }) => (
  <div className="flex items-center gap-4">
    <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl font-bold tracking-tight text-stone-700">
      {deriveInitials(contact.displayName)}
    </span>

    <div className="min-w-0">
      <h1 className="truncate text-2xl font-semibold tracking-tight">{contact.displayName}</h1>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="shrink-0 rounded-xs bg-stone-100 px-1.5 text-[10px] uppercase tracking-wide text-stone-500">
          {contact.kind === "organization" ? "Organization" : "Person"}
        </span>
        {contact.archivedAt ? (
          <span className="shrink-0 rounded-xs bg-stone-100 px-1.5 text-[10px] uppercase tracking-wide text-stone-500">
            Archived
          </span>
        ) : null}
      </div>
      <LastEditedBy record={contact} className="mt-1" />
    </div>
  </div>
)
