import type { BeverageItem, Timeblock } from "../database.js"

export type BeverageItemType =
  | "Special Orders"
  | "Beer"
  | "Wine"
  | "Coolers"
  | "Rails"
  | "Non-Alcoholic"

export type BeverageItemWithAssignments = BeverageItem & {
  assignedTimeblockIds: string[]
}

export type BeverageSectionPayload = {
  timeblocks: Timeblock[]
  items: BeverageItemWithAssignments[]
}