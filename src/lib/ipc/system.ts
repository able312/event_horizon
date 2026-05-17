export function openExternalUrl(url: string): Promise<void> {
  return window.electron.ipcRenderer.invoke("system:open-external", url) as Promise<void>
}
