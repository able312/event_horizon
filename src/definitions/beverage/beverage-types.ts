import type { BeverageItem, Timeblock } from "../database.js"

export type BeverageItemWithAssignments = BeverageItem & {
  assignedTimeblockIds: string[]
}

export type BeverageSectionPayload = {
  timeblocks: Timeblock[]
  items: BeverageItemWithAssignments[]
}
