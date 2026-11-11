// The Settings page's categories, in display order. The nav, the URL
// (`/settings/:category`) and the content map all key off these IDs.
//
// Groups say whose settings a category holds: "personal" settings belong to the
// signed-in user only; "venue" settings are shared by the whole team. To add a
// category: add it here, then map its ID to a component in
// components/settingsCategoryContent.tsx (TypeScript requires both).

export const SETTINGS_GROUPS = [
  { id: "personal", label: "Personal" },
  { id: "venue", label: "Venue" },
] as const

export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number]["id"]

export type SettingsCategory = {
  id: string
  group: SettingsGroupId
  label: string
  description: string
}

export const SETTINGS_CATEGORIES = [
  {
    id: "profile",
    group: "personal",
    label: "Profile",
    description: "How your name appears to the rest of the team.",
  },
  {
    id: "beverage-menu",
    group: "venue",
    label: "Beverage Menu",
    description: "Saved beverages the team can add to any event, with their price, pricing and note filled in.",
  },
  {
    id: "food-menu",
    group: "venue",
    label: "Food Menu",
    description: "Saved food items, sorted into categories, that the team can add to any food timeblock with their cost, pricing and notes filled in.",
  },
] as const satisfies readonly SettingsCategory[]

export type SettingsCategoryId = (typeof SETTINGS_CATEGORIES)[number]["id"]

/** A category as the nav and page use it. */
export type SettingsCategoryEntry = SettingsCategory & { id: SettingsCategoryId }

export const DEFAULT_SETTINGS_CATEGORY: SettingsCategoryId = "profile"

export function settingsPath(category: SettingsCategoryId = DEFAULT_SETTINGS_CATEGORY): string {
  return `/settings/${category}`
}

/** The category a URL segment names, the default when there is none, or null when it names no category. */
export function resolveSettingsCategory(segment: string | undefined): SettingsCategoryEntry | null {
  const id = segment ?? DEFAULT_SETTINGS_CATEGORY
  return SETTINGS_CATEGORIES.find((category) => category.id === id) ?? null
}

export type SettingsNavGroup = {
  id: SettingsGroupId
  label: string
  categories: SettingsCategoryEntry[]
}

/** Categories grouped for the nav, in order; groups with no categories yet are left out. */
export function groupSettingsCategories(
  categories: readonly SettingsCategoryEntry[] = SETTINGS_CATEGORIES,
): SettingsNavGroup[] {
  return SETTINGS_GROUPS
    .map((group) => ({ ...group, categories: categories.filter((category) => category.group === group.id) }))
    .filter((group) => group.categories.length > 0)
}
