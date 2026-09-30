import type { ContactsErrorCode, ContactsErrorPayload } from "../../definitions/contacts.js"

/**
 * Typed error thrown by the contacts repositories.
 *
 * Electron only forwards an error's message across IPC, so handlers convert this
 * to a ContactsErrorPayload and the renderer rebuilds it with fromPayload.
 */
export class ContactsError extends Error {
  readonly code: ContactsErrorCode
  readonly existingContactId?: string

  constructor(code: ContactsErrorCode, message: string, existingContactId?: string) {
    super(message)
    this.name = "ContactsError"
    this.code = code
    this.existingContactId = existingContactId
  }

  toPayload(): ContactsErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.existingContactId ? { existingContactId: this.existingContactId } : {}),
    }
  }

  static fromPayload(payload: ContactsErrorPayload): ContactsError {
    return new ContactsError(payload.code, payload.message, payload.existingContactId)
  }
}

export function isContactsError(err: unknown): err is ContactsError {
  return err instanceof ContactsError
}
