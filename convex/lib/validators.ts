import { v, type Validator } from "convex/values"

import {
  BEVERAGE_SERVICE_STYLES,
  BEVERAGE_TYPES,
  CART_LAYOUTS,
  CHARGE_CATEGORIES,
  CONTACT_KINDS,
  CONTACT_ROLE_TYPES,
  EVENT_STATUSES,
  EVENT_TYPES,
  FOOD_SERVICE_STYLES,
  PLAY_FORMATS,
  START_FORMATS,
  TIMEBLOCK_SECTION_TYPES,
} from "../../src/definitions/enums"

/** A validator accepting exactly the given string values. */
function literalUnion<T extends string>(values: readonly [T, T, ...T[]]): Validator<T, "required", never> {
  const [first, second, ...rest] = values.map((value) => v.literal(value))
  return v.union(first, second, ...rest) as unknown as Validator<T, "required", never>
}

/** Nullable field: stored as null rather than left out, matching the shared record types. */
export function nullable<T>(validator: Validator<T, "required", string>) {
  return v.union(validator, v.null())
}

export const eventType = literalUnion(EVENT_TYPES)
export const eventStatus = literalUnion(EVENT_STATUSES)
export const startFormat = literalUnion(START_FORMATS)
export const playFormat = literalUnion(PLAY_FORMATS)
export const cartLayout = literalUnion(CART_LAYOUTS)
export const chargeCategory = literalUnion(CHARGE_CATEGORIES)
export const timeblockSectionType = literalUnion(TIMEBLOCK_SECTION_TYPES)
export const foodServiceStyle = literalUnion(FOOD_SERVICE_STYLES)
export const beverageType = literalUnion(BEVERAGE_TYPES)
export const beverageServiceStyle = literalUnion(BEVERAGE_SERVICE_STYLES)
export const contactKind = literalUnion(CONTACT_KINDS)
export const contactRoleType = literalUnion(CONTACT_ROLE_TYPES)

export const cartGrid = v.array(v.array(v.union(v.number(), v.string(), v.null())))

/** IANA time zone of the person using the app, e.g. "America/Toronto". */
export const timeZone = v.string()
