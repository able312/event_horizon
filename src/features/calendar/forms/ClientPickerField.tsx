import React, { useState } from "react"
import { X } from "lucide-react"
import type { ContactFormErrors } from "~/features/contacts/lib/contactForm"
import ClientSearchInput from "./ClientSearchInput"
import NewClientFields from "./NewClientFields"
import {
  pickClient,
  searchClients,
  startNewClient,
  type ClientSelection,
  type PickedClient,
} from "./clientPickerForm"

interface ClientPickerFieldProps {
  selection: ClientSelection
  errors: ContactFormErrors
  /** Set when the new contact's email already belongs to an existing contact. */
  emailConflict: string | null
  onChange: (selection: ClientSelection) => void
}

/** The create-event client: search existing contacts, show the picked one, or enter a new one. */
const ClientPickerField: React.FC<ClientPickerFieldProps> = ({ selection, errors, emailConflict, onChange }) => {
  // Only refocus the search after the user leaves another mode; on first mount the title keeps focus
  const [focusSearch, setFocusSearch] = useState(false)

  const returnToSearch = (query: string) => {
    setFocusSearch(true)
    onChange(searchClients(query))
  }

  switch (selection.mode) {
    case "search":
      return (
        <ClientSearchInput
          query={selection.query}
          error={errors.name}
          autoFocus={focusSearch}
          onQueryChange={(query) => onChange(searchClients(query))}
          onPick={(contact) => onChange(pickClient(contact))}
          onCreateNew={() => onChange(startNewClient(selection.query))}
        />
      )
    case "picked":
      return <PickedClientField contact={selection.contact} onClear={() => returnToSearch("")} />
    case "create":
      return (
        <div className="space-y-2">
          <NewClientFields
            values={selection.values}
            errors={errors}
            onChange={(updates) => onChange({ ...selection, values: { ...selection.values, ...updates } })}
            onBack={() => returnToSearch(selection.query)}
          />
          {emailConflict ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              <span>{emailConflict}.</span>
              <button
                type="button"
                onClick={() => returnToSearch(selection.values.email.trim())}
                className="shrink-0 rounded-md border border-amber-200/40 px-2 py-1 text-amber-100 transition-colors hover:bg-amber-200/10"
              >
                Find existing contact
              </button>
            </div>
          ) : null}
        </div>
      )
  }
}

interface PickedClientFieldProps {
  contact: PickedClient
  onClear: () => void
}

const PickedClientField: React.FC<PickedClientFieldProps> = ({ contact, onClear }) => (
  <div>
    <span className="mb-1 block text-sm font-medium text-stone-100">Client</span>
    <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 py-2 pr-2 pl-3 text-stone-100">
      <span className="truncate" data-testid="picked-client">{contact.displayName}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Change client"
        className="rounded p-0.5 text-stone-400 transition-colors hover:bg-white/10 hover:text-stone-100"
      >
        <X className="size-4" />
      </button>
    </div>
  </div>
)

export default ClientPickerField
