import type { NewEvent } from "~/definitions/database"
import type { EventFormValues } from "./EventFormFields"
import type { ClientSelection } from "./clientPickerForm"

/** Initial values accepted by the create form, including client details and notes. */
export type CreateEventPrefill = {
  values: EventFormValues
  client: ClientSelection
  /** Not shown in the form; saved with the event so nothing the client sent is lost. */
  notes: Pick<NewEvent, "clientNotes" | "internalNotes">
}
