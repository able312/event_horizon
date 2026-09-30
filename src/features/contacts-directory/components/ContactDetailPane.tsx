import { useState } from "react"
import { toast } from "sonner"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { Body } from "~/components/layouts/SplitLayout"
import { getContactsErrorMessage } from "~/features/contacts/lib/eventContactsPanel"
import { useArchiveContact, useContact, useDeleteContact, useRestoreContact } from "~/hooks/useEventContacts"
import { isContactsError } from "~/lib/contacts/contactsError"

import { ContactDeleteConfirmDialog } from "./ContactDeleteConfirmDialog"
import { ContactDetailHeader } from "./ContactDetailHeader"
import { ContactDetailsList } from "./ContactDetailsList"
import { ContactEditForm } from "./ContactEditForm"
import { ContactProfileSummary } from "./ContactProfileSummary"
import { ContactsBodyHeader } from "./ContactsBodyHeader"

type ContactDetailPaneProps = {
  contactId: string
  onBack: () => void
  onDeleted: () => void
}

/** Mounted with key={contactId} by the parent, so edit/delete-confirm state resets on selection change. */
export const ContactDetailPane: React.FC<ContactDetailPaneProps> = ({ contactId, onBack, onDeleted }) => {
  const { data: contact, isLoading, isError, isFetching, refetch } = useContact(contactId)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const archiveContact = useArchiveContact()
  const restoreContact = useRestoreContact()
  const deleteContact = useDeleteContact()

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contactId)
      toast.success("Contact deleted")
      setIsConfirmingDelete(false)
      onDeleted()
    } catch (err) {
      toast.error(getContactsErrorMessage(err, "Failed to delete contact"))
      if (!isContactsError(err) || err.code !== "ContactInUse") setIsConfirmingDelete(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack} />
        <Body.Content>
          <p className="p-4 text-sm text-muted-foreground">Loading contact…</p>
        </Body.Content>
      </>
    )
  }

  // A failed load is not the same as a missing contact: the record may still exist, so offer a retry.
  if (isError) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack} />
        <Body.Content>
          <RouteBlockingError
            title="Could not load contact"
            description="This contact is temporarily unavailable. Please retry."
            onRetry={async () => {
              await refetch()
            }}
            isRetrying={isFetching}
          />
        </Body.Content>
      </>
    )
  }

  if (!contact) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack} />
        <Body.Content>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">This contact no longer exists.</p>
          </div>
        </Body.Content>
      </>
    )
  }

  if (isEditing) {
    return (
      <>
        <ContactsBodyHeader onBack={onBack}>
          <h1 className="mr-auto pl-2 text-sm font-semibold tracking-wide">Edit {contact.displayName}</h1>
        </ContactsBodyHeader>
        <Body.Content>
          <div className="overflow-y-auto p-4">
            <ContactEditForm contact={contact} onSaved={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
          </div>
        </Body.Content>
      </>
    )
  }

  return (
    <>
      <ContactsBodyHeader onBack={onBack}>
        <ContactDetailHeader
          contact={contact}
          onEdit={() => setIsEditing(true)}
          onArchive={() => archiveContact.mutate(contactId)}
          onRestore={() => restoreContact.mutate(contactId)}
          onRequestDelete={() => setIsConfirmingDelete(true)}
          isArchiving={archiveContact.isPending}
          isRestoring={restoreContact.isPending}
        />
      </ContactsBodyHeader>
      <Body.Content>
        <div className="mx-auto w-full max-w-6xl space-y-6 overflow-y-auto p-6">
          <ContactProfileSummary contact={contact} />
          <ContactDetailsList contact={contact} />
        </div>
      </Body.Content>

      <ContactDeleteConfirmDialog
        open={isConfirmingDelete}
        contactName={contact.displayName}
        isDeleting={deleteContact.isPending}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
