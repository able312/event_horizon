import type { TimeblockType } from "./timeblocks-types.js"

export type TimeblockPrefillRequest =
  | { mode: "blank" }
  | {
      mode: "section_default"
      sectionType: TimeblockType
      overrides?: {
        title?: string
        details?: string | null
      }
    }

export type CreateTimeblockInput = {
  eventId: string
  title?: string
  time?: string | null
  details?: string | null
  sectionType: TimeblockType
  prefill?: TimeblockPrefillRequest
}
