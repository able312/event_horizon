import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { SplitLayout } from "~/components/layouts/SplitLayout"
import type { Contact, ContactRoleType, ContactWithRoles } from "~/definitions/contacts"
import { useContactSearch } from "~/hooks/useEventContacts"
import { useDebounceValue } from "~/lib/debounce"

import ContactsDirectoryBody from "./components/ContactsDirectoryBody"
import ContactsDirectoryPanel from "./components/ContactsDirectoryPanel"

const DIRECTORY_SEARCH_LIMIT = 100

const ContactsDirectoryWorkspace: React.FC = () => {
  const { contactId } = useParams<{ contactId?: string }>()
  const navigate = useNavigate()

  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<ContactRoleType | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const debouncedQuery = useDebounceValue(query, 200)

  const search = useContactSearch(debouncedQuery, true, {
    role: role ?? undefined,
    includeArchived: showArchived,
    limit: DIRECTORY_SEARCH_LIMIT,
  })

  // A new selection (including one made from the create form) always leaves creation mode.
  useEffect(() => {
    if (contactId) setIsCreating(false)
  }, [contactId])

  // Clear creation mode directly: re-selecting the contact already in the URL doesn't change contactId,
  // so the effect above wouldn't fire.
  const showContact = (id: string) => {
    setIsCreating(false)
    navigate(`/contacts/${id}`)
  }

  const handleSelectContact = (contact: ContactWithRoles) => showContact(contact.id)

  const handleCreated = (contact: Contact) => showContact(contact.id)

  if (search.isError) {
    return (
      <RouteBlockingError
        title="Could not load contacts"
        description="The contact directory is temporarily unavailable. Please retry."
        onRetry={async () => {
          await search.refetch()
        }}
        isRetrying={search.isFetching}
      />
    )
  }

  return (
    <SplitLayout>
      <SplitLayout.PanelWrapper>
        <ContactsDirectoryPanel
          onStartCreate={() => setIsCreating(true)}
          query={query}
          onQueryChange={setQuery}
          role={role}
          onRoleChange={setRole}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          contacts={search.data?.items ?? []}
          isLoading={search.isLoading}
          selectedContactId={isCreating ? null : (contactId ?? null)}
          onSelectContact={handleSelectContact}
        />
      </SplitLayout.PanelWrapper>

      <SplitLayout.BodyWrapper>
        <ContactsDirectoryBody
          contactId={isCreating ? undefined : contactId}
          isCreating={isCreating}
          onBack={() => navigate("/events")}
          onCreated={handleCreated}
          onViewExisting={showContact}
          onCancelCreate={() => setIsCreating(false)}
          onDeleted={() => navigate("/contacts")}
        />
      </SplitLayout.BodyWrapper>
    </SplitLayout>
  )
}

export default ContactsDirectoryWorkspace
