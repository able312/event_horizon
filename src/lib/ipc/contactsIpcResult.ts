import type { IpcResult } from "~/definitions/ipc"
import { ContactsError } from "~/lib/contacts/contactsError"

/**
 * Invokes a contacts channel and unwraps its IpcResult envelope.
 * Expected failures reject with a ContactsError, so callers can check `err.code`
 * (e.g. EmailTaken with `err.existingContactId`).
 */
export async function invokeContactsChannel<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await window.electron.ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!result.ok) throw ContactsError.fromPayload(result.error)
  return result.data
}
