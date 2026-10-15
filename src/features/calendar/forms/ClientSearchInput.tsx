import React, { useId, useState } from "react"
import { UserPlus } from "lucide-react"
import type { ContactWithRoles } from "~/definitions/contacts"
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

  const contacts = hasQuery ? search.data?.items ?? [] : []
  const createIndex = contacts.length
  const showDropdown = isOpen && hasQuery

  const selectOption = (index: number) => {
    const contact = contacts[index]
    if (contact) onPick(contact)
    else onCreateNew()
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
    <div>
      <label htmlFor={`${listboxId}-input`} className="mb-1 block text-sm font-medium text-stone-100">Client</label>
      <input
        type="text"
        id={`${listboxId}-input`}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showDropdown ? optionId(Math.min(highlighted, createIndex)) : undefined}
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
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className={formFieldClasses}
      />

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Matching contacts"
          className="mt-1 overflow-hidden rounded-lg border border-white/15 bg-stone-800 py-1 shadow-lg"
        >
          {search.isError ? (
            // A failed search must not read as "no matches": that invites creating a duplicate
            <li className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-red-300">
              Could not search contacts.
              <button
                type="button"
                className="text-stone-100 underline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void search.refetch()}
              >
                Retry
              </button>
            </li>
          ) : search.isFetching && contacts.length === 0 ? (
            <li className="px-3 py-2 text-xs text-stone-400">Searching contacts…</li>
          ) : null}

          {contacts.map((contact, index) => (
            <ClientOption
              key={contact.id}
              id={optionId(index)}
              isHighlighted={highlighted === index}
              onHover={() => setHighlighted(index)}
              onSelect={() => selectOption(index)}
            >
              <span className="block truncate text-sm text-stone-100">{contact.displayName}</span>
              {contact.email || contact.phone ? (
                <span className="block truncate text-xs text-stone-400">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </ClientOption>
          ))}

          <ClientOption
            id={optionId(createIndex)}
            isHighlighted={highlighted >= createIndex}
            className={contacts.length > 0 ? "border-t border-white/10" : undefined}
            onHover={() => setHighlighted(createIndex)}
            onSelect={() => selectOption(createIndex)}
          >
            <span className="flex items-center gap-2 text-sm text-orange-300">
              <UserPlus className="size-4 shrink-0" />
              <span className="truncate">Create new contact “{query.trim()}”</span>
            </span>
          </ClientOption>
        </ul>
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
    className={cn("cursor-pointer px-3 py-1.5", isHighlighted && "bg-white/10", className)}
    // Keep focus in the input so blur doesn't close the list before the click lands
    onMouseDown={(e) => e.preventDefault()}
    onMouseEnter={onHover}
    onClick={onSelect}
  >
    {children}
  </li>
)

export default ClientSearchInput
