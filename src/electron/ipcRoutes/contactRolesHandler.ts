import { ipcMain } from "electron"

import type { ContactRoleType } from "../../definitions/contacts.js"
import contactRoleQueries from "../db/repository/contactRoles.js"
import { toContactsIpcResult } from "./ipcErrors.js"

export const registerContactRolesIpcHandlers = () => {
  ipcMain.handle("contact-roles:get-by-contact-id", async (_event, contactId: string) =>
    toContactsIpcResult("Error getting contact roles:", () => contactRoleQueries.listForContact(contactId)),
  )

  ipcMain.handle(
    "contact-roles:ensure",
    async (_event, contactId: string, role: ContactRoleType, vendorCategoryId?: string | null) =>
      toContactsIpcResult("Error saving contact role:", () =>
        contactRoleQueries.ensure(contactId, role, vendorCategoryId),
      ),
  )

  ipcMain.handle(
    "contact-roles:delete",
    async (_event, contactId: string, role: ContactRoleType, vendorCategoryId?: string | null) =>
      toContactsIpcResult("Error removing contact role:", () =>
        contactRoleQueries.remove(contactId, role, vendorCategoryId),
      ),
  )
}
