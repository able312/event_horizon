import { ipcMain } from "electron"

import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactRoleType,
  RecipientSelection,
  UpdateEventContact,
} from "../../definitions/contacts.js"
import eventContactQueries from "../db/repository/eventContacts.js"
import { toContactsIpcResult } from "./ipcErrors.js"

export const registerEventContactsIpcHandlers = () => {
  ipcMain.handle("event-contacts:get-panel", async (_event, eventId: string) =>
    toContactsIpcResult("Error getting event contacts panel:", () => eventContactQueries.getPanel(eventId)),
  )

  ipcMain.handle(
    "event-contacts:assign",
    async (
      _event,
      eventId: string,
      target: AssignContactTarget,
      role: ContactRoleType,
      opts?: AssignEventContactOptions,
    ) =>
      toContactsIpcResult("Error assigning contact to event:", () =>
        eventContactQueries.assign(eventId, target, role, opts),
      ),
  )

  ipcMain.handle("event-contacts:patch", async (_event, eventContactId: string, patch: UpdateEventContact) =>
    toContactsIpcResult("Error updating event contact:", () => eventContactQueries.update(eventContactId, patch)),
  )

  ipcMain.handle("event-contacts:set-primary", async (_event, eventContactId: string) =>
    toContactsIpcResult("Error setting primary event contact:", () =>
      eventContactQueries.setPrimary(eventContactId),
    ),
  )

  ipcMain.handle(
    "event-contacts:reorder",
    async (_event, eventId: string, role: ContactRoleType, orderedIds: string[]) =>
      toContactsIpcResult("Error reordering event contacts:", () =>
        eventContactQueries.reorder(eventId, role, orderedIds),
      ),
  )

  ipcMain.handle("event-contacts:delete", async (_event, eventContactId: string) =>
    toContactsIpcResult("Error removing event contact:", () => eventContactQueries.remove(eventContactId)),
  )

  ipcMain.handle("event-contacts:get-by-contact-id", async (_event, contactId: string) =>
    toContactsIpcResult("Error getting contact event history:", () =>
      eventContactQueries.listEventsForContact(contactId),
    ),
  )

  ipcMain.handle(
    "event-contacts:resolve-recipients",
    async (_event, eventId: string, selection: RecipientSelection) =>
      toContactsIpcResult("Error resolving recipients:", () =>
        eventContactQueries.resolveRecipients(eventId, selection),
      ),
  )
}
