// Query return type

import { timeblocks } from '~/electron/db/schema'
import type { Timeblock, FoodItem, BeverageItem, VendorItem, CartDetails } from '../database';

export type TimeblockWithItems = Timeblock & {
    foodItems?: FoodItem[],
    beverageItems?: BeverageItem[],
    vendorItem?: VendorItem,
    cartDetails?: Pick<CartDetails, "whatGoesOnCarts" | "customGrid">
}

export type TimeblockType = (typeof timeblocks.sectionType.enumValues)[number]

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
