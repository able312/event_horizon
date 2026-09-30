import { useId } from "react"

import type { ContactRoleType } from "~/definitions/contacts"
import { useVendorCategories } from "~/hooks/useEventContacts"
import { cn } from "~/lib/utils"

import type { AssignmentValues } from "../lib/assignmentForm"
import { getSwatch } from "../lib/contactStyles"
import { ROLE_LABELS } from "../lib/eventContactsPanel"
import { FormField } from "./FormField"
import { InlineQueryError } from "./InlineQueryError"
import { SegmentedControl } from "./SegmentedControl"

const ROLE_OPTIONS = (["client", "coordinator", "vendor"] as const).map((role) => ({
  value: role,
  label: ROLE_LABELS[role].singular,
}))

const ROLE_LABEL_PLACEHOLDERS: Record<ContactRoleType, string> = {
  client: "e.g. Bride, Company contact",
  coordinator: "e.g. Day-of coordinator",
  vendor: "e.g. Lead photographer",
}

type AssignmentFieldsProps = {
  values: AssignmentValues
  onChange: (patch: Partial<AssignmentValues>) => void
  /** The role of an existing assignment can't change; hide the picker when editing. */
  showRolePicker?: boolean
  categoryError?: string
}

/** Event-specific fields: role on this event, vendor category, a free-text role label, and notes. */
export const AssignmentFields: React.FC<AssignmentFieldsProps> = ({
  values,
  onChange,
  showRolePicker = true,
  categoryError,
}) => {
  const categoriesQuery = useVendorCategories()
  const categories = categoriesQuery.data ?? []
  const notesId = useId()

  const handleRoleChange = (role: ContactRoleType) => {
    // A category is only valid for vendors
    onChange({ role, vendorCategoryId: role === "vendor" ? values.vendorCategoryId : null })
  }

  return (
    <div className="space-y-3">
      {showRolePicker ? (
        <SegmentedControl
          aria-label="Role on this event"
          options={ROLE_OPTIONS}
          value={values.role}
          onChange={handleRoleChange}
        />
      ) : null}

      {values.role === "vendor" ? (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Vendor category</p>
          {/* A vendor needs a category, so an empty picker would silently block saving */}
          {categoriesQuery.isError ? (
            <InlineQueryError
              message="Could not load vendor categories."
              onRetry={() => void categoriesQuery.refetch()}
              isRetrying={categoriesQuery.isFetching}
            />
          ) : (
            <div role="radiogroup" aria-label="Vendor category" className="flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const selected = category.id === values.vendorCategoryId
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
                    onClick={() => onChange({ vendorCategoryId: category.id })}
                  >
                    <span className={cn("size-2 rounded-full", getSwatch(category.colorToken).dot)} aria-hidden />
                    {category.label}
                  </button>
                )
              })}
            </div>
          )}
          {categoryError ? <p className="mt-1 text-xs text-destructive">{categoryError}</p> : null}
        </div>
      ) : null}

      <FormField
        label="Role label (optional)"
        value={values.roleLabel}
        placeholder={ROLE_LABEL_PLACEHOLDERS[values.role]}
        onChange={(event) => onChange({ roleLabel: event.target.value })}
      />

      <div>
        <label htmlFor={notesId} className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
          Notes for this event (optional)
        </label>
        <textarea
          id={notesId}
          value={values.notes}
          placeholder="e.g. Arrival time, who they report to"
          onChange={(event) => onChange({ notes: event.target.value })}
          rows={3}
          className="w-full rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:ring-[2px] focus-visible:ring-orange-500"
        />
      </div>
    </div>
  )
}
