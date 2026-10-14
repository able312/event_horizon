// IPC Routes or IPC Handlers will act like an express server router file. 
// Thier only job is to recieve the incoming request and route it towards the appropriate function. 

import { registerPDFGenerationHandler } from "./savePdfHandler.js"
import { registerSystemIpcHandlers } from "./systemHandler.js"

export const registerAllIpcHandlers = () => {
    registerPDFGenerationHandler()
    registerSystemIpcHandlers()
}
