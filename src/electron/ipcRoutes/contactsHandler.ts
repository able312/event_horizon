import { ipcMain } from "electron"

import type { ContactSearchRequest, NewContact, UpdateContact } from "../../definitions/contacts.js"
import contactQueries from "../db/repository/contacts.js"
import { toContactsIpcResult } from "./ipcErrors.js"

export const registerContactsIpcHandlers = () => {
  ipcMain.handle("contacts:get-by-id", async (_event, id: string) =>
    toContactsIpcResult("Error getting contact:", () => contactQueries.getById(id)),
  )

  ipcMain.handle("contacts:find-by-email", async (_event, email: string) =>
    toContactsIpcResult("Error finding contact by email:", () => contactQueries.findByEmail(email)),
  )

  ipcMain.handle("contacts:search", async (_event, params: ContactSearchRequest) =>
    toContactsIpcResult("Error searching contacts:", () => contactQueries.search(params)),
  )

  ipcMain.handle("contacts:post", async (_event, input: NewContact) =>
    toContactsIpcResult("Error creating contact:", () => contactQueries.create(input)),
  )

  ipcMain.handle("contacts:patch", async (_event, id: string, patch: UpdateContact) =>
    toContactsIpcResult("Error updating contact:", () => contactQueries.update(id, patch)),
  )

  ipcMain.handle("contacts:archive", async (_event, id: string) =>
    toContactsIpcResult("Error archiving contact:", () => contactQueries.archive(id)),
  )

  ipcMain.handle("contacts:restore", async (_event, id: string) =>
    toContactsIpcResult("Error restoring contact:", () => contactQueries.restore(id)),
  )

  ipcMain.handle("contacts:merge", async (_event, sourceId: string, targetId: string) =>
    toContactsIpcResult("Error merging contacts:", () => contactQueries.merge(sourceId, targetId)),
  )

  ipcMain.handle("contacts:delete", async (_event, id: string) =>
    toContactsIpcResult("Error deleting contact:", () => contactQueries.delete(id)),
  )
}
