import { ipcMain } from "electron"

import type { NewVendorCategory, UpdateVendorCategory } from "../../definitions/contacts.js"
import vendorCategoryQueries from "../db/repository/vendorCategories.js"
import { toContactsIpcResult } from "./ipcErrors.js"

export const registerVendorCategoriesIpcHandlers = () => {
  ipcMain.handle("vendor-categories:get-many", async (_event, options?: { includeArchived?: boolean }) =>
    toContactsIpcResult("Error getting vendor categories:", () => vendorCategoryQueries.list(options)),
  )

  ipcMain.handle("vendor-categories:post", async (_event, input: NewVendorCategory) =>
    toContactsIpcResult("Error creating vendor category:", () => vendorCategoryQueries.create(input)),
  )

  ipcMain.handle("vendor-categories:patch", async (_event, id: string, patch: UpdateVendorCategory) =>
    toContactsIpcResult("Error updating vendor category:", () => vendorCategoryQueries.update(id, patch)),
  )

  ipcMain.handle("vendor-categories:archive", async (_event, id: string) =>
    toContactsIpcResult("Error archiving vendor category:", () => vendorCategoryQueries.archive(id)),
  )

  ipcMain.handle("vendor-categories:restore", async (_event, id: string) =>
    toContactsIpcResult("Error restoring vendor category:", () => vendorCategoryQueries.restore(id)),
  )
}
