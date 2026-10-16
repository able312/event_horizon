import type { Contact } from "~/definitions/contacts"
import { ContactDetailRow } from "~/features/contacts/components/ContactDetailRow"

import { ContactEventHistoryList } from "./ContactEventHistoryList"
import { ContactRolesEditor } from "./ContactRolesEditor"
import { ContactSectionCard } from "./ContactSectionCard"

type ContactDetailsListProps = {
  contact: Contact
}

/** Contact info, notes and roles across the top, with full-width event history below. */
export const ContactDetailsList: React.FC<ContactDetailsListProps> = ({ contact }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-stretch gap-4">
      <ContactSectionCard title="Contact info">
        <dl className="space-y-1.5">
          <ContactDetailRow label="Email" value={contact.email} />
          <ContactDetailRow label="Phone" value={contact.phone} />
        </dl>
      </ContactSectionCard>

      {contact.notes ? (
        <ContactSectionCard title="Notes">
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{contact.notes}</p>
        </ContactSectionCard>
      ) : null}

      <ContactRolesEditor contactId={contact.id} />
    </div>

    <ContactEventHistoryList contactId={contact.id} />
  </div>
)
