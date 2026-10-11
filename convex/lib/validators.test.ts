import { convexTest } from "convex-test"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { describe, expect, it } from "vitest"

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
import {
  beverageServiceStyle,
  beverageType,
  cartGrid,
  cartLayout,
  chargeCategory,
  contactKind,
  contactRoleType,
  eventStatus,
  eventType,
  foodServiceStyle,
  nullable,
  playFormat,
  startFormat,
  timeblockSectionType,
  timeZone,
} from "./validators"

const modules = import.meta.glob("../**/*.{ts,js}")

const enumCases = [
  { name: "eventType", validator: eventType, values: EVENT_TYPES },
  { name: "eventStatus", validator: eventStatus, values: EVENT_STATUSES },
  { name: "startFormat", validator: startFormat, values: START_FORMATS },
  { name: "playFormat", validator: playFormat, values: PLAY_FORMATS },
  { name: "cartLayout", validator: cartLayout, values: CART_LAYOUTS },
  { name: "chargeCategory", validator: chargeCategory, values: CHARGE_CATEGORIES },
  { name: "timeblockSectionType", validator: timeblockSectionType, values: TIMEBLOCK_SECTION_TYPES },
  { name: "foodServiceStyle", validator: foodServiceStyle, values: FOOD_SERVICE_STYLES },
  { name: "beverageType", validator: beverageType, values: BEVERAGE_TYPES },
  { name: "beverageServiceStyle", validator: beverageServiceStyle, values: BEVERAGE_SERVICE_STYLES },
  { name: "contactKind", validator: contactKind, values: CONTACT_KINDS },
  { name: "contactRoleType", validator: contactRoleType, values: CONTACT_ROLE_TYPES },
] as const

describe.each(enumCases)("$name", ({ validator, values }) => {
  const schema = defineSchema({ records: defineTable({ value: validator }) })

  it.each(values)("accepts %s", async (value) => {
    const t = convexTest(schema, modules)
    const record = await t.run(async ({ db }) => {
      const id = await db.insert("records", { value })
      return db.get(id)
    })

    expect(record?.value).toBe(value)
  })

  it.each(["invalid", "", 123, false, null, [], {}].map((value) => ({ value })))("rejects $value", async ({ value }) => {
    const t = convexTest(schema, modules)

    // Bypass client types deliberately to exercise storage validation of malformed input.
    await expect(t.run(({ db }) => db.insert("records", { value: value as never }))).rejects.toThrow()
  })
})

describe("nullable", () => {
  const schema = defineSchema({
    records: defineTable({
      text: nullable(v.string()),
      count: nullable(v.number()),
      status: nullable(eventStatus),
    }),
  })

  it.each([
    { text: "Notes", count: 0, status: "confirmed" as const },
    { text: null, count: null, status: null },
  ])("preserves valid values and explicit nulls: %j", async (values) => {
    const t = convexTest(schema, modules)
    const record = await t.run(async ({ db }) => {
      const id = await db.insert("records", values)
      return db.get(id)
    })

    expect(record).toMatchObject(values)
  })

  it.each([
    { count: 1, status: "confirmed" },
    { text: "Notes", status: "confirmed" },
    { text: "Notes", count: 1 },
    { text: 123, count: 1, status: "confirmed" },
    { text: "Notes", count: "1", status: "confirmed" },
    { text: "Notes", count: 1, status: "invalid" },
  ])("rejects missing fields and invalid non-null values: %j", async (values) => {
    const t = convexTest(schema, modules)

    await expect(t.run(({ db }) => db.insert("records", values as never))).rejects.toThrow()
  })
})

describe("cartGrid", () => {
  const schema = defineSchema({ records: defineTable({ grid: cartGrid }) })

  it.each([
    { grid: [] },
    { grid: [[]] },
    { grid: [[1, "1A", null], [2.5, "", -1], []] },
  ])("preserves arrays of rows containing numbers, strings, and nulls: %j", async ({ grid }) => {
    const t = convexTest(schema, modules)
    const record = await t.run(async ({ db }) => {
      const id = await db.insert("records", { grid })
      return db.get(id)
    })

    expect(record?.grid).toEqual(grid)
  })

  it.each([
    { grid: null },
    { grid: "1A" },
    { grid: {} },
    { grid: [1, "1A", null] },
    { grid: [[true]] },
    { grid: [[{}]] },
    { grid: [[[1]]] },
    {},
  ])("rejects malformed grids: %j", async (values) => {
    const t = convexTest(schema, modules)

    await expect(t.run(({ db }) => db.insert("records", values as never))).rejects.toThrow()
  })
})

describe("timeZone", () => {
  const schema = defineSchema({ records: defineTable({ value: timeZone }) })

  it("preserves a time zone string", async () => {
    const t = convexTest(schema, modules)
    const record = await t.run(async ({ db }) => {
      const id = await db.insert("records", { value: "America/Toronto" })
      return db.get(id)
    })

    expect(record?.value).toBe("America/Toronto")
  })

  it.each([null, 123, false, [], {}].map((value) => ({ value })))("rejects non-string values: $value", async ({ value }) => {
    const t = convexTest(schema, modules)

    await expect(t.run(({ db }) => db.insert("records", { value: value as never }))).rejects.toThrow()
  })
})
