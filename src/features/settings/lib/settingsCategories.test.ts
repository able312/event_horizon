import { describe, expect, it } from "vitest"

import {
  DEFAULT_SETTINGS_CATEGORY,
  groupSettingsCategories,
  resolveSettingsCategory,
  SETTINGS_CATEGORIES,
  settingsPath,
} from "./settingsCategories"

describe("resolveSettingsCategory", () => {
  it("opens the default category when the URL names none", () => {
    expect(resolveSettingsCategory(undefined)?.id).toBe(DEFAULT_SETTINGS_CATEGORY)
  })

  it("finds a category by its URL segment", () => {
    expect(resolveSettingsCategory("profile")?.label).toBe("Profile")
    expect(resolveSettingsCategory("beverage-menu")?.label).toBe("Beverage Menu")
  })

  it("returns null for an unknown segment", () => {
    expect(resolveSettingsCategory("nope")).toBeNull()
  })
})

describe("groupSettingsCategories", () => {
  it("keeps group order and leaves out empty groups", () => {
    const groups = groupSettingsCategories()
    expect(groups.map((group) => group.id)).toEqual(["personal", "venue"])
    expect(groups[0].categories.map((category) => category.id)).toEqual(["profile"])
    expect(groups[1].categories.map((category) => category.id)).toEqual(["beverage-menu"])
  })

  it("places categories under their group in list order", () => {
    const venue = { ...SETTINGS_CATEGORIES[0], group: "venue" as const }
    const groups = groupSettingsCategories([venue, SETTINGS_CATEGORIES[0]])
    expect(groups.map((group) => [group.id, group.categories.length])).toEqual([["personal", 1], ["venue", 1]])
  })
})

describe("settingsPath", () => {
  it("links to a category, defaulting to the first", () => {
    expect(settingsPath()).toBe("/settings/profile")
    expect(settingsPath("profile")).toBe("/settings/profile")
  })
})
