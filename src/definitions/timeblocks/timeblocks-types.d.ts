// Query return type

import type { Timeblock, TimeblockSectionType, FoodItem, BeverageItem, CartDetails } from '../database';

export type TimeblockWithItems = Timeblock & {
    foodItems?: FoodItem[],
    beverageItems?: BeverageItem[],
    cartDetails?: Pick<CartDetails, "whatGoesOnCarts" | "customGrid">
}

export type TimeblockType = TimeblockSectionType

export type TimelineRowSource =
  | "timeblock"
  | "event_start"
  | "event_end"
  | "tournament_start"
  | "tournament_end"
  | "cart_detail"

export type TimelineMeta = {
  source: TimelineRowSource
  isSystem: boolean
  isEditable: boolean
}

export type TimelineTimeblock = TimeblockWithItems & {
  time: string
  timelineMeta: TimelineMeta
}
