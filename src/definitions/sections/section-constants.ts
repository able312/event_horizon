import {
  BEVERAGE_SERVICE_STYLES,
  BEVERAGE_TYPES,
  CHARGE_CATEGORIES,
  FOOD_SERVICE_STYLES,
  PLAY_FORMATS,
  PRICING_BASES,
} from "../enums"
import type { PricingBasis } from "../database"

export const ITER_FOOD_SERVICE_STYLE = FOOD_SERVICE_STYLES

export const ITER_BEVERAGE_SERVICE_STYLE = BEVERAGE_SERVICE_STYLES

export const ITER_BEVERAGE_TYPE = BEVERAGE_TYPES

export const ITER_GOLF_PLAY_FORMAT = PLAY_FORMATS

export const ITER_MENU_OF_CHARGE_CATEGORY = CHARGE_CATEGORIES

export const ITER_PRICING_BASIS = PRICING_BASES

/** How each pricing basis reads in every pricing dropdown (Estimate section, saved menus). */
export const PRICING_BASIS_LABELS: Record<PricingBasis, string> = {
  each: "Each",
  per_person: "Per person",
}
