import { useMemo, useState } from "react"
import { Mails, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import type { ContactRoleType, EventContactsPanelItem } from "~/definitions/contacts"
import { useEventContacts } from "~/hooks/useEventContacts"

import { useEmailEventContacts } from "../hooks/useEmailEventContacts"
import { getContactsErrorMessage, pruneSelection, toggleGroupSelection, toggleId } from "../lib/eventContactsPanel"
import { AddEventContactDialog } from "./AddEventContactDialog"
import { EditEventContactDialog, type EditTarget } from "./EditEventContactDialog"
import { EventContactGroup } from "./EventContactGroup"

type ContactsListProps = {
  eventId: string
  eventTitle: string
}

const ContactsList: React.FC<ContactsListProps> = ({ eventId, eventTitle }) => {
  const {
    data: panel,
    isLoading,
    isError,
    refetch,
    assignContactAsync,
    isAssigning,
    saveContactAsync,
    isSaving,
    setPrimary,
    removeContact,
  } = useEventContacts(eventId)
  const { emailContacts, isResolving } = useEmailEventContacts(eventId, eventTitle)

  const [rawSelection, setRawSelection] = useState<Set<string>>(new Set())
  const [addRole, setAddRole] = useState<ContactRoleType | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  // Ignore selections for contacts that have since left the panel
  const selectedIds = useMemo(() => pruneSelection(rawSelection, panel), [rawSelection, panel])

  const handleRemove = (role: ContactRoleType, item: EventContactsPanelItem) => {
    removeContact(item.eventContactId)
    toast(`${item.displayName} removed from event`, {
      action: {
        label: "Undo",
        // Re-assigning restores the removed row, including its role label
        onClick: () => {
          assignContactAsync({
            target: { contactId: item.contactId },
            role,
            opts: { vendorCategoryId: item.vendorCategory?.id ?? null, isPrimary: item.isPrimary },
          }).catch((err: unknown) => toast.error(getContactsErrorMessage(err, "Failed to restore contact")))
        },
      },
    })
  }

  const totalContacts = panel?.groups.reduce((sum, group) => sum + group.items.length, 0) ?? 0

  return (
    <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide">Event Team</h3>
          <p className="text-xs text-muted-foreground">Clients, coordinators and vendors on this event.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 shrink-0 rounded-xs px-2 text-sm"
          onClick={() => setAddRole("client")}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="py-3 text-xs text-muted-foreground">Loading contacts…</p>
      ) : isError || !panel ? (
        <div className="flex items-center justify-between py-3 text-xs text-destructive">
          Couldn't load contacts for this event.
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          {panel.groups.map((group) => (
            <EventContactGroup
              key={group.role}
              group={group}
              eventTitle={eventTitle}
              selectedIds={selectedIds}
              onToggleSelected={(id) => setRawSelection(toggleId(selectedIds, id))}
              onToggleGroup={(ids) => setRawSelection(toggleGroupSelection(selectedIds, ids))}
              onAdd={() => setAddRole(group.role)}
              onEdit={(item) => setEditTarget({ role: group.role, item })}
              onSetPrimary={(item) => setPrimary(item.eventContactId)}
              onRemove={(item) => handleRemove(group.role, item)}
            />
          ))}
        </div>
      )}

      {totalContacts > 0 ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            className="h-8 flex-1 rounded-xs text-sm"
            disabled={selectedIds.size === 0 || isResolving}
            onClick={() => void emailContacts([...selectedIds])}
          >
            <Mails className="size-3.5" />
            {selectedIds.size > 0 ? `Email ${selectedIds.size} selected` : "Select contacts to email"}
          </Button>
          {selectedIds.size > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Clear selection"
              onClick={() => setRawSelection(new Set())}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <AddEventContactDialog
        open={addRole !== null}
        onOpenChange={(open) => !open && setAddRole(null)}
        panel={panel}
        initialRole={addRole ?? undefined}
        isAssigning={isAssigning}
        onAssign={assignContactAsync}
      />
      <EditEventContactDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        isSaving={isSaving}
        onSave={saveContactAsync}
      />
    </section>
  )
}

export default ContactsList
