import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { AuthService, AuthServiceSnapshot } from '../services/authService.js'
import { logAndThrow } from './ipcErrors.js'

let authService: AuthService | null = null
let unsubscribe: (() => void) | null = null

export function registerAuthIpcHandlers(service: AuthService): () => void {
  authService = service

  ipcMain.handle('auth:get-status', async (_event: IpcMainInvokeEvent): Promise<AuthServiceSnapshot> => {
    try {
      if (!authService) {
        return { isAuthenticated: false, user: null, isLoading: false }
      }
      return authService.getSnapshot()
    } catch (err) {
      logAndThrow('Error getting auth status:', err)
    }
  })

  ipcMain.handle('auth:sign-in', async (_event: IpcMainInvokeEvent): Promise<void> => {
    try {
      if (!authService) {
        throw new Error('Auth service not initialized')
      }
      await authService.signIn()
    } catch (err) {
      logAndThrow('Error signing in:', err)
    }
  })

  ipcMain.handle('auth:sign-out', async (_event: IpcMainInvokeEvent): Promise<void> => {
    try {
      if (!authService) {
        throw new Error('Auth service not initialized')
      }
      await authService.signOut()
    } catch (err) {
      logAndThrow('Error signing out:', err)
    }
  })

  ipcMain.handle('auth:get-access-token', async (_event: IpcMainInvokeEvent): Promise<string | null> => {
    try {
      if (!authService) {
        return null
      }
      return await authService.getAccessToken()
    } catch (err) {
      logAndThrow('Error getting access token:', err)
    }
  })

  // Subscribe to auth state changes and forward to renderer
  unsubscribe = authService.subscribe((snapshot) => {
    // Send to all windows
    const { BrowserWindow } = require('electron')
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('auth:status-changed', snapshot)
    }
  })

  return () => {
    ipcMain.removeHandler('auth:get-status')
    ipcMain.removeHandler('auth:sign-in')
    ipcMain.removeHandler('auth:sign-out')
    ipcMain.removeHandler('auth:get-access-token')
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    authService = null
  }
}
