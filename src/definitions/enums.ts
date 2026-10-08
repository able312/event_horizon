// Allowed values for every enum-like record field. The storage schema and the UI
// both read from here, so neither depends on the other.

export const EVENT_TYPES = ["tournament", "wedding", "function"] as const
export const EVENT_STATUSES = ["new_lead", "tentative", "confirmed", "closed", "lost"] as const

export const START_FORMATS = ["Shotgun", "Tee Times"] as const
export const PLAY_FORMATS = ["Scramble", "Best Ball", "Stroke Play", "Modified Stableford"] as const

export const CART_LAYOUTS = ["template-12-hole-shotgun", "custom"] as const

export const CHARGE_CATEGORIES = ["Goods", "Service", "Golf", "Food & Beverage", "Venue"] as const

export const TIMEBLOCK_SECTION_TYPES = [
  "food",
  "beverage",
  "setup_instruction",
  "note",
  "tournament_detail",
  "cart_detail",
] as const

export const FOOD_SERVICE_STYLES = ["Buffet", "Family-Style", "Plated", "Passed"] as const

export const BEVERAGE_TYPES = ["Special Orders", "Beer", "Wine", "Coolers", "Rails", "Non-Alcoholic"] as const
export const BEVERAGE_SERVICE_STYLES = ["Consumption Bar", "Cash Bar", "Open Bar", "Ticketed Bar"] as const

export const CONTACT_KINDS = ["individual", "organization"] as const
export const CONTACT_ROLE_TYPES = ["client", "coordinator", "vendor"] as const
