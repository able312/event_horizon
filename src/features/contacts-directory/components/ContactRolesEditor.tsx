import { useState } from "react"
import { Plus, X } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { InlineQueryError } from "~/features/contacts/components/InlineQueryError"
import { SegmentedControl } from "~/features/contacts/components/SegmentedControl"
import { getRoleBadgeClass, getSwatch } from "~/features/contacts/lib/contactStyles"
import { ROLE_LABELS } from "~/features/contacts/lib/eventContactsPanel"
import {
  useContactRoles,
  useEnsureContactRole,
  useRemoveContactRole,
  useVendorCategories,
} from "~/hooks/useEventContacts"
import type { ContactRoleType } from "~/definitions/contacts"
import { cn } from "~/lib/utils"

import { ContactSectionCard } from "./ContactSectionCard"

const ROLE_OPTIONS = (["client", "coordinator", "vendor"] as const).map((role) => ({
  value: role,
  label: ROLE_LABELS[role].singular,
}))

type ContactRolesEditorProps = {
  contactId: string
}

export const ContactRolesEditor: React.FC<ContactRolesEditorProps> = ({ contactId }) => {
  const rolesQuery = useContactRoles(contactId)
  const categoriesQuery = useVendorCategories()
  const roles = rolesQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const ensureRole = useEnsureContactRole()
  const removeRole = useRemoveContactRole()

  const [isAdding, setIsAdding] = useState(false)
  const [pendingRole, setPendingRole] = useState<ContactRoleType>("client")
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)

  const canAdd = pendingRole !== "vendor" || Boolean(pendingCategoryId)

  const closeAddForm = () => {
    setIsAdding(false)
    setPendingRole("client")
    setPendingCategoryId(null)
  }

  const handleAdd = () => {
    if (!canAdd) return
    ensureRole.mutate(
      { contactId, role: pendingRole, vendorCategoryId: pendingRole === "vendor" ? pendingCategoryId : null },
      { onSuccess: closeAddForm },
    )
  }

  return (
    <ContactSectionCard
      title="Standing roles"
      action={
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAdding((open) => !open)}>
          <Plus className="size-3.5" /> Add role
        </Button>
      }
    >

      {rolesQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading roles…</p>
      ) : rolesQuery.isError ? (
        <InlineQueryError
          message="Could not load standing roles."
          onRetry={() => void rolesQuery.refetch()}
          isRetrying={rolesQuery.isFetching}
        />
      ) : roles.length === 0 ? (
        <p className="text-xs text-muted-foreground">No standing roles yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {roles.map((role) => {
            const category = role.vendorCategoryId
              ? (categories.find((candidate) => candidate.id === role.vendorCategoryId) ?? null)
              : null
            const label =
              role.role === "vendor" && category ? `${category.label} vendor` : ROLE_LABELS[role.role].singular

            return (
              <li
                key={role.id}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
                  getRoleBadgeClass(
                    role.role,
                    category ? { id: category.id, label: category.label, colorToken: category.colorToken } : null,
                  ),
                )}
              >
                {label}
                <button
                  type="button"
                  aria-label={`Remove ${label} role`}
                  className="text-current/70 hover:text-current"
                  onClick={() =>
                    removeRole.mutate({ contactId, role: role.role, vendorCategoryId: role.vendorCategoryId })
                  }
                >
                  <X className="size-3" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isAdding ? (
        <div className="space-y-2 rounded-xs border border-border p-2">
          <SegmentedControl aria-label="Role to add" options={ROLE_OPTIONS} value={pendingRole} onChange={setPendingRole} />

          {pendingRole === "vendor" && categoriesQuery.isError ? (
            <InlineQueryError
              message="Could not load vendor categories."
              onRetry={() => void categoriesQuery.refetch()}
              isRetrying={categoriesQuery.isFetching}
            />
          ) : pendingRole === "vendor" ? (
            <div role="radiogroup" aria-label="Vendor category" className="flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const selected = category.id === pendingCategoryId
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                      selected
                        ? "border-stone-800 bg-stone-800 text-white"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                    onClick={() => setPendingCategoryId(category.id)}
                  >
                    <span className={cn("size-2 rounded-full", getSwatch(category.colorToken).dot)} aria-hidden />
                    {category.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={closeAddForm}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={!canAdd || ensureRole.isPending}
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Roles are also added automatically when this contact is assigned to an event.
      </p>
    </ContactSectionCard>
  )
}
