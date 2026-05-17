import type { UpdateSetupInstruction, SetupInstruction, Timeblock } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types";

export function getSetupInstructionsByEvent(eventId: string): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("setup-instructions:get-by-event", eventId) as Promise<TimeblockWithItems[]>
}

export function createSetupInstruction(eventId: string): Promise<{ timeblock: Timeblock; setupInstruction: SetupInstruction }> {
  return window.electron.ipcRenderer.invoke("setup-instructions:post", eventId) as Promise<{ timeblock: Timeblock; setupInstruction: SetupInstruction }>
}

export function updateSetupInstruction(id: string, data: UpdateSetupInstruction): Promise<SetupInstruction> {
  return window.electron.ipcRenderer.invoke("setup-instructions:patch", id, data ) as Promise<SetupInstruction>
}

export function deleteSetupInstruction(timeblockId: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("setup-instructions:delete", timeblockId) as Promise<boolean>
}
