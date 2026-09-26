import type { IpcResult } from "../../definitions/ipc.js"
import { isContactsError } from "../../lib/contacts/contactsError.js"

export function toError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) {
    return err
  }

  return new Error(fallbackMessage)
}

export function logAndThrow(context: string, err: unknown): never {
  const error = toError(err, context)
  console.error(context, error)
  throw error
}

/**
 * Runs a contacts repository call for an IPC handler. ContactsErrors (expected, user-facing)
 * are returned as values; anything else is logged and thrown like other handlers.
 */
export function toContactsIpcResult<T>(context: string, run: () => T): IpcResult<T> {
  try {
    return { ok: true, data: run() }
  } catch (err) {
    if (isContactsError(err)) return { ok: false, error: err.toPayload() }
    logAndThrow(context, err)
  }
}
