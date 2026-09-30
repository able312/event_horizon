import type { ContactKind } from "~/definitions/contacts"

import type { ContactFormErrors, ContactFormValues } from "../lib/contactForm"
import { FormField } from "./FormField"
import { SegmentedControl } from "./SegmentedControl"

const KIND_OPTIONS: Array<{ value: ContactKind; label: string }> = [
  { value: "individual", label: "Person" },
  { value: "organization", label: "Organization" },
]

type ContactFormFieldsProps = {
  values: ContactFormValues
  errors: ContactFormErrors
  onChange: (patch: Partial<ContactFormValues>) => void
}

/** Identity fields shared by the create and edit dialogs. */
export const ContactFormFields: React.FC<ContactFormFieldsProps> = ({ values, errors, onChange }) => {
  const isOrganization = values.kind === "organization"

  return (
    <div className="space-y-3">
      <SegmentedControl
        aria-label="Contact type"
        options={KIND_OPTIONS}
        value={values.kind}
        onChange={(kind) => onChange({ kind })}
      />

      {isOrganization ? (
        <FormField
          label="Organization name"
          autoFocus
          value={values.organizationName}
          error={errors.name}
          placeholder="Riverside AV"
          onChange={(event) => onChange({ organizationName: event.target.value })}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="First name"
              autoFocus
              value={values.firstName}
              error={errors.name}
              onChange={(event) => onChange({ firstName: event.target.value })}
            />
            <FormField
              label="Last name"
              value={values.lastName}
              onChange={(event) => onChange({ lastName: event.target.value })}
            />
          </div>
          <FormField
            label="Company (optional)"
            value={values.organizationName}
            onChange={(event) => onChange({ organizationName: event.target.value })}
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Email"
          type="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
        <FormField
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </div>
    </div>
  )
}
