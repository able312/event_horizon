import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"

import type { WorkspaceCategoryId } from "../types"

export function getWorkspaceCategoryIdForSectionType(
  sectionType: TimeblockType | undefined,
): WorkspaceCategoryId | null {
  switch (sectionType) {
    case SECTION_TYPE.FOOD:
      return "food"
    case SECTION_TYPE.BEVERAGE:
      return "beverage"
    case SECTION_TYPE.VENDOR:
    case SECTION_TYPE.CART_DETAIL:
      return "logistics"
    case SECTION_TYPE.SETUP_INSTRUCTION:
      return "setup"
    case SECTION_TYPE.NOTE:
      return "notes"
    case SECTION_TYPE.TOURNAMENT_DETAIL:
      return "tournament"
    default:
      return null
  }
}
