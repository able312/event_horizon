import React from "react"
import { ArrowLeft } from "lucide-react"
import type { ContactFormErrors } from "~/features/contacts/lib/contactForm"
import { formFieldClasses } from "./eventFormStyles"
import type { NewClientFormValues } from "./clientPickerForm"

interface NewClientFieldsProps {
  values: NewClientFormValues
  errors: ContactFormErrors
  onChange: (updates: Partial<NewClientFormValues>) => void
  onBack: () => void
}

/** A new client for the event; saved as a contact and made the event's primary client. */
const NewClientFields: React.FC<NewClientFieldsProps> = ({ values, errors, onChange, onBack }) => {
  // Focus whichever of name/email the search text didn't fill
  const focusEmail = Boolean(values.name.trim()) && !values.email.trim()

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">New contact</span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-stone-300 transition-colors hover:text-stone-100"
        >
          <ArrowLeft className="size-3.5" />
          Back to search
        </button>
      </div>

      <div>
        <label htmlFor="new-client-name" className="mb-1 block text-sm font-medium text-stone-100">Client Name</label>
        <input
          type="text"
          id="new-client-name"
          autoFocus={!focusEmail}
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={formFieldClasses}
        />
        {errors.name ? <p className="mt-1 text-xs text-red-300">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="new-client-email" className="mb-1 block text-sm font-medium text-stone-100">Client Email</label>
        <input
          type="email"
          id="new-client-email"
          autoFocus={focusEmail}
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={formFieldClasses}
        />
        {errors.email ? <p className="mt-1 text-xs text-red-300">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="new-client-phone" className="mb-1 block text-sm font-medium text-stone-100">Client Phone</label>
        <input
          type="tel"
          id="new-client-phone"
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className={formFieldClasses}
        />
      </div>
    </div>
  )
}

export default NewClientFields
