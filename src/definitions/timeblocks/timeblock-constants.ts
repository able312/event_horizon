import { timeblocks } from '~/electron/db/schema'
import type { TimeblockType } from '~/definitions/timeblocks/timeblocks-types'

export const ITER_TIMELINE_TYPES = timeblocks.sectionType.enumValues

type TimeblockTypeMapping = {
  [K in Uppercase<TimeblockType>]: TimeblockType;
};
export const SECTION_TYPE = {
  FOOD: "food",
  BEVERAGE: "beverage",
  SETUP_INSTRUCTION: "setup_instruction",
  VENDOR: "vendor",
  NOTE: "note",
  TOURNAMENT_DETAIL: "tournament_detail",
  CART_DETAIL: "cart_detail",

} as const satisfies TimeblockTypeMapping