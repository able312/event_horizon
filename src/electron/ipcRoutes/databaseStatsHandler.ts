import { ipcMain } from "electron"
import { getDatabaseStatsDynamic } from "../db/repository/dbStats.js";
import { logAndThrow } from "./ipcErrors.js";

export const registerDatabaseStatsIpcHandlers = () => {
    // READ
    ipcMain.handle('db-stats:get', async () => {
        try {
            return getDatabaseStatsDynamic();
        } catch (err) {
            logAndThrow('Error getting players:', err);
        }
    })
}
