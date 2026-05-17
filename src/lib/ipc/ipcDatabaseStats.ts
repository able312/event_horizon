export async function getDatabaseStats(): Promise<unknown> {
  return await window.electron.ipcRenderer.invoke('db-stats:get')
}