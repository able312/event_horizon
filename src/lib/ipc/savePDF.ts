export type SavePdfOptions = {
  defaultFileName?: string
}

export function callSavePDF(options?: SavePdfOptions): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("generate-pdf", options) as Promise<boolean>
}