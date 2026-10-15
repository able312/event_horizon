import React, { useId, useState } from "react"
import { UserPlus } from "lucide-react"
import type { ContactWithRoles } from "~/definitions/contacts"
import { ContactResultSummary } from "~/features/contacts/components/ContactResultSummary"
import { ContactSearchStatus } from "~/features/contacts/components/ContactSearchStatus"
import { useContactSearch } from "~/hooks/useEventContacts"
import { useDebounceValue } from "~/lib/debounce"
import { cn } from "~/lib/utils"
import { formFieldClasses } from "./eventFormStyles"

const MAX_RESULTS = 6

interface ClientSearchInputProps {
  query: string
  error?: string
  autoFocus?: boolean
  onQueryChange: (query: string) => void
  onPick: (contact: ContactWithRoles) => void
  onCreateNew: () => void
}

/** Wraps around the result list; the extra last slot is "Create new contact". */
function moveHighlight(current: number, delta: number, optionCount: number): number {
  return (current + delta + optionCount) % optionCount
}

/** Client name input that searches contacts by name or email and offers a "create new" fallback. */
const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
  query,
  error,
  autoFocus = false,
  onQueryChange,
  onPick,
  onCreateNew,
}) => {
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(autoFocus)
  const [highlighted, setHighlighted] = useState(0)
  const debouncedQuery = useDebounceValue(query, 200)
  const hasQuery = query.trim().length > 0
  const search = useContactSearch(debouncedQuery, debouncedQuery.trim().length > 0, { limit: MAX_RESULTS })

  // search.data is retained across queries, so only trust it once it belongs to what is typed now
  const isCurrent = debouncedQuery.trim() === query.trim() && !search.isFetching
  const contacts = hasQuery && isCurrent && !search.isError ? search.data?.items ?? [] : []
  // Offering "create" before the search settles (or after it fails) risks duplicating an existing contact
  const canCreate = hasQuery && isCurrent && !search.isError
  const createIndex = contacts.length
  const showDropdown = isOpen && hasQuery

  const selectOption = (index: number) => {
    const contact = contacts[index]
    if (contact) onPick(contact)
    else if (canCreate) onCreateNew()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setHighlighted((current) => moveHighlight(current, event.key === "ArrowDown" ? 1 : -1, createIndex + 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      selectOption(Math.min(highlighted, createIndex))
    } else if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  const optionId = (index: number) => `${listboxId}-option-${index}`

  return (
    <div
      // Close only when focus leaves the picker, so the Retry button inside the dropdown stays reachable
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false)
      }}
    >
      <label htmlFor={`${listboxId}-input`} className="mb-1 block text-sm font-medium text-stone-100">Client</label>
      <input
        type="text"
        id={`${listboxId}-input`}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showDropdown && (canCreate || contacts.length > 0) ? optionId(Math.min(highlighted, createIndex)) : undefined}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Search by name or email"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setHighlighted(0)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={formFieldClasses}
      />

      {showDropdown ? (
        <div className="mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div onMouseDown={(e) => e.preventDefault()}>
          <ContactSearchStatus
            isLoading={!isCurrent}
            isError={search.isError}
            hasResults={contacts.length > 0}
            onRetry={() => void search.refetch()}
            emptyMessage={null}
          />
          </div>
          <ul id={listboxId} role="listbox" aria-label="Matching contacts" className="py-1">
            {contacts.map((contact, index) => (
              <ClientOption
                key={contact.id}
                id={optionId(index)}
                isHighlighted={highlighted === index}
                onHover={() => setHighlighted(index)}
                onSelect={() => selectOption(index)}
              >
                <ContactResultSummary contact={contact} />
              </ClientOption>
            ))}

            {canCreate ? (
            <ClientOption
              id={optionId(createIndex)}
              isHighlighted={highlighted >= createIndex}
              className={cn("text-sm text-orange-300", contacts.length > 0 && "border-t border-border")}
              onHover={() => setHighlighted(createIndex)}
              onSelect={() => selectOption(createIndex)}
            >
              <UserPlus className="size-4 shrink-0" />
              <span className="truncate">Create new contact “{query.trim()}”</span>
            </ClientOption>
            ) : null}
          </ul>
        </div>
      ) : null}

      {error && !showDropdown ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}

interface ClientOptionProps {
  id: string
  isHighlighted: boolean
  className?: string
  onHover: () => void
  onSelect: () => void
  children: React.ReactNode
}

const ClientOption: React.FC<ClientOptionProps> = ({ id, isHighlighted, className, onHover, onSelect, children }) => (
  <li
    id={id}
    role="option"
    aria-selected={isHighlighted}
    className={cn("flex cursor-pointer items-center gap-3 px-3 py-1.5", isHighlighted && "bg-accent", className)}
    // Keep focus in the input so blur doesn't close the list before the click lands
    onMouseDown={(e) => e.preventDefault()}
    onMouseEnter={onHover}
    onClick={onSelect}
  >
    {children}
  </li>
)

export default ClientSearchInput
