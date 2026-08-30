import type { TimeblockType } from "./timeblocks-types.js"

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