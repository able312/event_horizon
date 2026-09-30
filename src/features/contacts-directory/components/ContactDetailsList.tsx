import type { Contact } from "~/definitions/contacts"
import { ContactDetailRow } from "~/features/contacts/components/ContactDetailRow"

import { ContactEventHistoryList } from "./ContactEventHistoryList"
import { ContactRolesEditor } from "./ContactRolesEditor"
import { ContactSectionCard } from "./ContactSectionCard"

type ContactDetailsListProps = {
  contact: Contact
}

/** Two columns: contact info/notes/roles on the left, event history on the right. */
export const ContactDetailsList: React.FC<ContactDetailsListProps> = ({ contact }) => (
  <div className="grid gap-6 lg:grid-cols-[minmax(260px,1fr)_2fr]">
    <div className="space-y-4">
      <ContactSectionCard title="Contact info">
        <dl className="space-y-1.5">
          <ContactDetailRow label="Email" value={contact.email} />
          <ContactDetailRow label="Phone" value={contact.phone} />
        </dl>
      </ContactSectionCard>

      {contact.notes ? (
        <ContactSectionCard title="Notes">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p>
        </ContactSectionCard>
      ) : null}

      <ContactRolesEditor contactId={contact.id} />
    </div>

    <ContactEventHistoryList contactId={contact.id} />
  </div>
)
