// IPC Routes or IPC Handlers will act like an express server router file. 
// Thier only job is to recieve the incoming request and route it towards the appropriate function. 

import { registerDatabaseStatsIpcHandlers } from "./databaseStatsHandler.js"
import { registerEventsIpcHandlers } from "./eventsHandler.js"
import { registerTimeblocksIpcHandlers } from "./timeblocksHandler.js"
import { registerFoodItemsIpcHandlers } from "./foodItemsHandler.js"
import { registerBeverageItemsIpcHandlers } from "./beverageItemsHandler.js"
import { registerPaymentsIpcHandlers } from "./paymentsHandler.js"
import { registerTouchpointsIpcHandlers } from "./touchpointsHandler.js"
import { registerTournamentDetailsIpcHandlers } from "./tournamentDetailsHandler.js"
import { registerMenuOfChargeItemsIpcHandlers } from "./menuOfChargeItemsHandler.js"
import { registerCartDetailsIpcHandlers } from "./cartDetailsHandler.js"
import { registerPDFGenerationHandler } from "./savePdfHandler.js"
import { registerSystemIpcHandlers } from "./systemHandler.js"
import { registerContactsIpcHandlers } from "./contactsHandler.js"
import { registerContactRolesIpcHandlers } from "./contactRolesHandler.js"
import { registerVendorCategoriesIpcHandlers } from "./vendorCategoriesHandler.js"
import { registerEventContactsIpcHandlers } from "./eventContactsHandler.js"

export const registerAllIpcHandlers = () => {
    registerDatabaseStatsIpcHandlers()
    registerEventsIpcHandlers()
    registerTimeblocksIpcHandlers()
    registerFoodItemsIpcHandlers()
    registerBeverageItemsIpcHandlers()
    registerPaymentsIpcHandlers()
    registerTouchpointsIpcHandlers()
    registerTournamentDetailsIpcHandlers()
    registerMenuOfChargeItemsIpcHandlers()
    registerCartDetailsIpcHandlers()
    registerPDFGenerationHandler()
    registerSystemIpcHandlers()
    registerContactsIpcHandlers()
    registerContactRolesIpcHandlers()
    registerVendorCategoriesIpcHandlers()
    registerEventContactsIpcHandlers()
}
