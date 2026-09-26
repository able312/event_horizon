import { useId } from "react"

import { Input } from "~/components/atoms/input"

type FormFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  label: string
  error?: string
}

/** Labelled text input with an inline error, sized for the contact dialogs. */
export const FormField: React.FC<FormFieldProps> = ({ label, error, className, ...inputProps }) => {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input id={id} aria-invalid={Boolean(error)} {...inputProps} />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
