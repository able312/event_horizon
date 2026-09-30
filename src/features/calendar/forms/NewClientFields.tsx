import React from "react"
import type { ContactFormErrors } from "~/features/contacts/lib/contactForm"
import { formFieldClasses } from "./eventFormStyles"
import type { NewClientFormValues } from "./newClientForm"

interface NewClientFieldsProps {
  values: NewClientFormValues
  errors: ContactFormErrors
  onChange: (updates: Partial<NewClientFormValues>) => void
}

/** Optional client for a new event; saved as a contact and made the event's primary client. */
const NewClientFields: React.FC<NewClientFieldsProps> = ({ values, errors, onChange }) => {
  return (
    <>
      <div>
        <label htmlFor="new-client-name" className="mb-1 block text-sm font-medium text-stone-100">Client Name</label>
        <input
          type="text"
          id="new-client-name"
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
    </>
  )
}

export default NewClientFields
