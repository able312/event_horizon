import { Body } from "~/components/layouts/SplitLayout"
import type { Contact } from "~/definitions/contacts"

import { ContactCreateForm } from "./ContactCreateForm"
import { ContactDetailPane } from "./ContactDetailPane"
import { ContactsBodyHeader } from "./ContactsBodyHeader"

type ContactsDirectoryBodyProps = {
  contactId: string | undefined
  isCreating: boolean
  onBack: () => void
  onCreated: (contact: Contact) => void
  onCancelCreate: () => void
  onDeleted: () => void
}

const ContactsDirectoryBody: React.FC<ContactsDirectoryBodyProps> = ({
  contactId,
  isCreating,
  onBack,
  onCreated,
  onCancelCreate,
  onDeleted,
}) => {
  if (isCreating) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack}>
          <h1 className="mr-auto pl-2 text-sm font-semibold tracking-wide">New contact</h1>
        </ContactsBodyHeader>
        <Body.Content>
          <div className="overflow-y-auto p-4">
            <ContactCreateForm onCreated={onCreated} onCancel={onCancelCreate} />
          </div>
        </Body.Content>
      </>
    )
  }

  if (!contactId) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack} />
        <Body.Content>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Select a contact, or create a new one.</p>
          </div>
        </Body.Content>
      </>
    )
  }

  return <ContactDetailPane key={contactId} contactId={contactId} onBack={onBack} onDeleted={onDeleted} />
}

export default ContactsDirectoryBody
