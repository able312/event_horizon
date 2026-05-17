export function callSavePDF(): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("generate-pdf") as Promise<boolean>
}