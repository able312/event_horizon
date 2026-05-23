import type { TimeblockType } from "./timeblocks-types.js"

export const SECTION_DEFAULT_PREFILLS: Partial<Record<TimeblockType, { title: string; details: string | null }>> = {
  setup_instruction: {
    title: "Setup",
    details: "Describe what needs to be done...",
  },
}

export function getSectionDefaultPrefill(sectionType: TimeblockType) {
  return SECTION_DEFAULT_PREFILLS[sectionType] ?? null
}
