import { useState } from "react"
import { ArrowLeft, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import type { AssignContactTarget, ContactRoleType, EventContactsPanel } from "~/definitions/contacts"
import type { AssignEventContactVariables } from "~/hooks/useEventContacts"
import { useContactSearch } from "~/hooks/useEventContacts"
import { useDebounceValue } from "~/lib/debounce"
import { deriveDisplayName } from "~/lib/contacts/contactRules"
import { isContactsError } from "~/lib/contacts/contactsError"

import { DEFAULT_ASSIGNMENT, getAssignmentError, toAssignOptions, type AssignmentValues } from "../lib/assignmentForm"
import {
  EMPTY_CONTACT_FORM,
  formValuesFromSearch,
  hasFormErrors,
  toContactPayload,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "../lib/contactForm"
import { getContactsErrorMessage, isAlreadyAssigned, ROLE_LABELS } from "../lib/eventContactsPanel"
import { AssignmentFields } from "./AssignmentFields"
import { ContactFormFields } from "./ContactFormFields"
import { ContactSearchResults } from "./ContactSearchResults"
import { InlineFormPanel } from "./InlineFormPanel"

type Mode = "search" | "create"

/** Set when a new contact's email already belongs to someone, so we can offer that contact instead. */
type EmailConflict = { contactId: string; message: string }

type AddEventContactFormProps = {
  panel: EventContactsPanel | undefined
  initialRole?: ContactRoleType
  isAssigning: boolean
  onAssign: (variables: AssignEventContactVariables) => Promise<unknown>
  onClose: () => void
}

/** Mount only while adding, so the search and form state reset each time it opens. */
export const AddEventContactForm: React.FC<AddEventContactFormProps> = ({
  panel,
  initialRole = "client",
  isAssigning,
  onAssign,
  onClose,
}) => {
  const [mode, setMode] = useState<Mode>("search")
  const [assignment, setAssignment] = useState<AssignmentValues>({ ...DEFAULT_ASSIGNMENT, role: initialRole })
  const [showAssignmentErrors, setShowAssignmentErrors] = useState(false)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState<ContactFormValues>(EMPTY_CONTACT_FORM)
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({})
  const [emailConflict, setEmailConflict] = useState<EmailConflict | null>(null)

  const debouncedQuery = useDebounceValue(query, 200)
  const search = useContactSearch(debouncedQuery, mode === "search")
  const assignmentError = getAssignmentError(assignment)
  const roleName = ROLE_LABELS[assignment.role].singular.toLowerCase()

  const assign = async (target: AssignContactTarget, name: string) => {
    if (assignmentError) {
      setShowAssignmentErrors(true)
      return
    }

    try {
      await onAssign({ target, role: assignment.role, opts: toAssignOptions(assignment) })
      toast.success(`${name} added as ${roleName}`)
      onClose()
    } catch (err) {
      if (isContactsError(err) && err.code === "EmailTaken" && err.existingContactId) {
        setEmailConflict({ contactId: err.existingContactId, message: err.message })
        return
      }
      toast.error(getContactsErrorMessage(err, "Failed to add contact"))
    }
  }

  const handleCreate = () => {
    const errors = validateContactForm(form)
    setFormErrors(errors)
    if (hasFormErrors(errors)) return
    setEmailConflict(null)
    void assign({ newContact: toContactPayload(form) }, deriveDisplayName(form) ?? "Contact")
  }

  const openCreateMode = () => {
    setForm(formValuesFromSearch(query))
    setFormErrors({})
    setEmailConflict(null)
    setMode("create")
  }

  const updateAssignment = (patch: Partial<AssignmentValues>) => {
    setAssignment((current) => ({ ...current, ...patch }))
  }

  const updateForm = (patch: Partial<ContactFormValues>) => {
    setForm((current) => ({ ...current, ...patch }))
    if (patch.email !== undefined) setEmailConflict(null)
  }

  const contacts = search.data?.items ?? []

  return (
    <InlineFormPanel
      title={mode === "search" ? "Add to event team" : "New contact"}
      description={
        mode === "search"
          ? "Pick someone from your contacts, or create a new contact."
          : "Saved to your contacts and added to this event."
      }
      onCancel={onClose}
      footer={
        mode === "search" ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openCreateMode}>
              <UserPlus className="size-4" />
              Create new contact
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("search")}>
              <ArrowLeft className="size-4" />
              Back to search
            </Button>
            <Button type="button" size="sm" disabled={isAssigning} onClick={handleCreate}>
              {isAssigning ? "Adding…" : `Create & add as ${roleName}`}
            </Button>
          </>
        )
      }
    >
      <AssignmentFields
        values={assignment}
        onChange={updateAssignment}
        categoryError={showAssignmentErrors ? assignmentError : undefined}
      />

      <div className="border-t border-border pt-4">
        {mode === "search" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                placeholder="Search by name, company, email or phone"
                className="pl-8"
                aria-label="Search contacts"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xs border border-border bg-background">
              <ContactSearchResults
                contacts={contacts}
                isLoading={search.isFetching}
                isError={search.isError}
                onRetry={() => void search.refetch()}
                hasQuery={debouncedQuery.trim().length > 0}
                disabled={isAssigning}
                isAssigned={(contactId) =>
                  isAlreadyAssigned(panel, contactId, assignment.role, assignment.vendorCategoryId)
                }
                onSelect={(contact) => void assign({ contactId: contact.id }, contact.displayName)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ContactFormFields values={form} errors={formErrors} onChange={updateForm} />
            {emailConflict ? (
              <div className="flex items-center justify-between gap-3 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>{emailConflict.message}.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 bg-background"
                  disabled={isAssigning}
                  onClick={() => void assign({ contactId: emailConflict.contactId }, "Contact")}
                >
                  Add them instead
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </InlineFormPanel>
  )
}
