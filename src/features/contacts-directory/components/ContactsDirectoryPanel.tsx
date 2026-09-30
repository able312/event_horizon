import { Search } from "lucide-react"

import { Panel } from "~/components/layouts/SplitLayout"
import type { ContactRoleType, ContactWithRoles } from "~/definitions/contacts"
import { cn } from "~/lib/utils"

import { ContactDirectoryRow } from "./ContactDirectoryRow"
import ContactsDirectoryPanelHeader from "./ContactsDirectoryPanelHeader"

const ROLE_FILTERS: Array<{ value: ContactRoleType | null; label: string }> = [
  { value: null, label: "All" },
  { value: "client", label: "Clients" },
  { value: "coordinator", label: "Coordinators" },
  { value: "vendor", label: "Vendors" },
]

type ContactsDirectoryPanelProps = {
  onStartCreate: () => void
  query: string
  onQueryChange: (query: string) => void
  role: ContactRoleType | null
  onRoleChange: (role: ContactRoleType | null) => void
  showArchived: boolean
  onShowArchivedChange: (showArchived: boolean) => void
  contacts: ContactWithRoles[]
  isLoading: boolean
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreFailed: boolean
  onLoadMore: () => void
  selectedContactId: string | null
  onSelectContact: (contact: ContactWithRoles) => void
}

const ContactsDirectoryPanel: React.FC<ContactsDirectoryPanelProps> = ({
  onStartCreate,
  query,
  onQueryChange,
  role,
  onRoleChange,
  showArchived,
  onShowArchivedChange,
  contacts,
  isLoading,
  hasMore,
  isLoadingMore,
  loadMoreFailed,
  onLoadMore,
  selectedContactId,
  onSelectContact,
}) => {
  return (
    <>
      <Panel.Header>
        <ContactsDirectoryPanelHeader onStartCreate={onStartCreate} />
      </Panel.Header>

      <Panel.Content>
        <div className="space-y-3 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search contacts…"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pr-4 pl-10 text-sm text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((filter) => {
              const selected = filter.value === role
              return (
                <button
                  key={filter.label}
                  type="button"
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs transition-colors",
                    selected
                      ? "border-orange-500 bg-orange-500/10 text-orange-400"
                      : "border-white/15 bg-white/5 text-stone-300 hover:bg-white/10",
                  )}
                  onClick={() => onRoleChange(filter.value)}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>

          <label className="flex items-center gap-2 text-xs text-stone-400">
            <input
              type="checkbox"
              className="size-3.5 cursor-pointer accent-orange-500"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.target.checked)}
            />
            Show archived
          </label>
        </div>

        {isLoading && contacts.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-stone-400">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-stone-400">
            {query ? "No matching contacts." : "Your contact directory is empty."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-white/10">
              {contacts.map((contact) => (
                <ContactDirectoryRow
                  key={contact.id}
                  contact={contact}
                  selected={contact.id === selectedContactId}
                  onSelect={onSelectContact}
                />
              ))}
            </ul>
            {hasMore ? (
              <div className="space-y-1.5 p-3">
                {loadMoreFailed ? (
                  <p className="text-center text-xs text-red-400">Could not load more contacts.</p>
                ) : null}
                <button
                  type="button"
                  disabled={isLoadingMore}
                  className="h-8 w-full rounded-lg border border-white/15 bg-white/5 text-xs text-stone-300 transition-colors hover:bg-white/10 disabled:opacity-50"
                  onClick={onLoadMore}
                >
                  {isLoadingMore ? "Loading…" : loadMoreFailed ? "Retry" : "Load more contacts"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </Panel.Content>
    </>
  )
}

export default ContactsDirectoryPanel
