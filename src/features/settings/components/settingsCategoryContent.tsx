import type { ComponentType } from "react"

import { BeverageMenuSettings } from "../beverage-menu/BeverageMenuSettings"
import { FoodMenuSettings } from "../food-menu/FoodMenuSettings"
import { ProfileSettings } from "../profile/ProfileSettings"
import type { SettingsCategoryId } from "../lib/settingsCategories"

/** The body each settings category renders. Every category ID must have one. */
export const SETTINGS_CATEGORY_CONTENT: Record<SettingsCategoryId, ComponentType> = {
  profile: ProfileSettings,
  "beverage-menu": BeverageMenuSettings,
  "food-menu": FoodMenuSettings,
}
