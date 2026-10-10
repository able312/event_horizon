import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import {
  LEGACY_TABLES,
  chunkBySize,
  findMissingReferences,
  findSchemaProblems,
  importLegacyData,
  selectSql,
  toLegacyRows,
  verifyLegacyImport,
  type Fields,
  type ImportBackend,
  type LegacyData,
  type LegacyTable,
} from "./lib/legacyImport"
import { checkValue } from "./lib/schemaCheck"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

// Rows as better-sqlite3 returns them for selectSql: 0/1 booleans, JSON text, legacy UUIDs.
const raw: Record<LegacyTable, Record<string, unknown>[]> = {
  events: [
    { legacyId: "ev-1", title: "Smith Wedding", type: "wedding", status: "confirmed", startDateTime: "2026-06-01T20:00:00.000Z", endDateTime: "2026-06-02T04:00:00.000Z",
      minGuests: 100, maxGuests: 140, guestCountFinal: 1, driveFolderId: "drive-1", calendarId: "cal-1", clientNotes: "Client note", internalNotes: "Internal",
      isInternal: 0, createdAt: "1767225600000", updatedAt: "1767312000000" },
    { legacyId: "ev-2", title: "Unscheduled", type: "function", status: "new_lead", startDateTime: null, endDateTime: null, minGuests: null, maxGuests: null,
      guestCountFinal: null, driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: null, isInternal: null, createdAt: "1767225600001", updatedAt: null },
  ],
  contacts: [
    { legacyId: "c-1", kind: "individual", firstName: "Ada", lastName: "Smith", organizationName: null, displayName: "Ada Smith", email: "Ada@Example.com",
      emailNormalized: "ada@example.com", phone: "555-0100", notes: null, archivedAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
    { legacyId: "c-2", kind: "organization", firstName: null, lastName: null, organizationName: "Riverside AV", displayName: "Riverside AV", email: null,
      emailNormalized: null, phone: null, notes: "Archived vendor", archivedAt: "2026-02-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
  ],
  vendorCategories: [
    { legacyId: "vc-1", key: "av", label: "AV", colorToken: "blue", sortOrder: 1, archivedAt: null },
  ],
  tournamentDetails: [
    { legacyId: "td-1", eventId: "ev-1", time: "08:00", startFormat: null, playFormat: null, numberOfPlayers: 72, paceOfPlay: null, leadCarts: null, notes: "Shotgun", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: null },
  ],
  cartDetails: [
    { legacyId: "cd-1", eventId: "ev-1", time: "07:30", layout: "custom", customGrid: "[[1,\"Lead\",null],[2,3,4]]", whatGoesOnCarts: "", assignedTo: "Sam",
      rentingCarts: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: null },
    { legacyId: "cd-2", eventId: "ev-2", time: null, layout: "template-12-hole-shotgun", customGrid: null, whatGoesOnCarts: null, assignedTo: null,
      rentingCarts: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: null },
  ],
  payments: [
    { legacyId: "p-1", eventId: "ev-1", amountCents: 150000, date: "2026-03-01", recieptNumber: "R-1", notes: "Deposit", createdAt: "2026-03-01T00:00:00.000Z" },
  ],
  touchpoints: [
    { legacyId: "t-1", eventId: "ev-1", title: "Send contract", dueDate: "2026-03-05", completedAt: null, createdAt: "2026-03-01T00:00:00.000Z" },
  ],
  menuOfChargeItems: [
    { legacyId: "m-1", eventId: "ev-1", name: "Room rental", quantity: 1, category: null, includes: null, unitPriceCents: 50000, createdAt: "2026-03-01T00:00:00.000Z" },
  ],
  timeblocks: [
    { legacyId: "tb-food", eventId: "ev-1", title: "Dinner", time: "18:00", details: null, sectionType: "food", assignedTo: null, createdAt: "1767225600000", updatedAt: null },
    { legacyId: "tb-bar", eventId: "ev-1", title: "Bar", time: "17:00", details: "Open", sectionType: "beverage", assignedTo: "Lee", createdAt: "1767225600000", updatedAt: "1767225600009" },
  ],
  foodItems: [
    { legacyId: "f-1", timeblockId: "tb-food", name: "Salmon", quantity: 70, serviceStyle: null, includes: "Rice", unitPriceCents: 4200 },
  ],
  beverageItems: [
    { legacyId: "b-1", eventId: "ev-1", name: "House Red", quantity: 12, type: "Wine", serviceStyle: null, includes: null, unitPriceCents: null },
  ],
  beverageItemTimeblocks: [
    { beverageItemId: "b-1", timeblockId: "tb-bar" },
  ],
  contactRoles: [
    { legacyId: "r-1", contactId: "c-1", role: "client", vendorCategoryId: null, createdAt: "2026-01-01T00:00:00.000Z" },
    { legacyId: "r-2", contactId: "c-2", role: "vendor", vendorCategoryId: "vc-1", createdAt: "2026-01-01T00:00:00.000Z" },
  ],
  eventContacts: [
    { legacyId: "ec-1", eventId: "ev-1", contactId: "c-1", role: "client", vendorCategoryId: null, isPrimary: 1, roleLabel: null, notes: null, sortOrder: 0,
      removedAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    { legacyId: "ec-2", eventId: "ev-1", contactId: "c-2", role: "vendor", vendorCategoryId: "vc-1", isPrimary: 0, roleLabel: "Sound", notes: "Load in 3pm", sortOrder: 0,
      removedAt: "2026-02-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
  ],
}

function legacyData(overrides: Partial<Record<LegacyTable, Record<string, unknown>[]>> = {}): LegacyData {
  const rows = { ...raw, ...overrides }
  return Object.fromEntries(LEGACY_TABLES.map((spec) => [spec.table, toLegacyRows(spec, rows[spec.table])])) as LegacyData
}

function backendFor(t: ReturnType<typeof convexTest>): ImportBackend {
  return {
    nonEmptyTables: () => t.query(internal.legacyImport.nonEmptyTables, {}),
    insertBatch: (table, docs) => t.mutation(internal.legacyImport.insertBatch, { table, docs }),
    dump: async (table) => {
      const docs: Fields[] = []
      let cursor: string | null = null
      for (;;) {
        const page: { page: Fields[]; isDone: boolean; continueCursor: string } =
          await t.query(internal.legacyImport.dump, { table, paginationOpts: { cursor, numItems: 2 } })
        docs.push(...page.page)
        if (page.isDone) return docs
        cursor = page.continueCursor
      }
    },
  }
}

beforeEach(() => vi.stubEnv("EVENT_HORIZON_LEGACY_IMPORT", "enabled"))
afterEach(() => vi.unstubAllEnvs())

describe("table specs", () => {
  it("cover every Convex field of every business table except audit fields", () => {
    for (const spec of LEGACY_TABLES) {
      const fields = Object.keys(schema.tables[spec.table].validator.fields)
        .filter((field) => field !== "createdBy" && field !== "updatedBy")
        // updatedAt is new (Convex-only) on tables whose SQLite rows never had one.
        .filter((field) => field !== "updatedAt" || Object.hasOwn(spec.columns, "updatedAt"))
      expect({ table: spec.table, fields: Object.keys(spec.columns).sort() }).toEqual({ table: spec.table, fields: fields.sort() })
    }
  })

  it("insert parents before the tables that reference them", () => {
    const seen = new Set<string>()
    for (const spec of LEGACY_TABLES) {
      for (const target of Object.values(spec.refs ?? {})) expect({ table: spec.table, target, before: seen.has(target) }).toEqual({ table: spec.table, target, before: true })
      seen.add(spec.table)
    }
    expect(seen.size).toBe(Object.keys(schema.tables).length - 1)
  })

  it("select every column under its field name", () => {
    const menu = LEGACY_TABLES.find((spec) => spec.table === "menuOfChargeItems")!
    expect(selectSql(menu)).toBe(
      'SELECT "id" AS "legacyId", "event_id" AS "eventId", "name" AS "name", "quantity" AS "quantity", "charge_type" AS "category", "includes" AS "includes", "unit_price_cents" AS "unitPriceCents", "created_at" AS "createdAt" FROM "menu_of_charge_items" ORDER BY "id"',
    )
    const links = LEGACY_TABLES.find((spec) => spec.table === "beverageItemTimeblocks")!
    expect(selectSql(links)).toBe('SELECT "beverage_item_id" AS "beverageItemId", "timeblock_id" AS "timeblockId" FROM "beverage_item_timeblocks" ORDER BY "beverage_item_id", "timeblock_id"')
  })
})

describe("reading legacy rows", () => {
  it("converts booleans and JSON, and keeps legacy IDs", () => {
    const data = legacyData()
    expect(data.cartDetails[0]).toEqual({ legacyId: "cd-1", fields: expect.objectContaining({ rentingCarts: true, customGrid: [[1, "Lead", null], [2, 3, 4]] }) })
    expect(data.cartDetails[1].fields).toMatchObject({ rentingCarts: false, customGrid: null })
    expect(data.eventContacts.map((row) => row.fields.isPrimary)).toEqual([true, false])
    expect(data.beverageItemTimeblocks[0].legacyId).toBeNull()
  })

  it("rejects unexpected boolean values and rows without IDs", () => {
    const carts = LEGACY_TABLES.find((spec) => spec.table === "cartDetails")!
    expect(() => toLegacyRows(carts, [{ ...raw.cartDetails[0], rentingCarts: 2 }])).toThrow(/expected 0 or 1/)
    expect(() => toLegacyRows(carts, [{ ...raw.cartDetails[0], legacyId: null }])).toThrow(/without an ID/)
  })

  it("reports references to missing rows", () => {
    expect(findMissingReferences(legacyData())).toEqual([])
    expect(findMissingReferences(legacyData({ payments: [{ ...raw.payments[0], eventId: "ev-gone" }] })))
      .toEqual(["payments p-1: eventId points to missing events ev-gone"])
  })

  it("batches by serialized size without splitting rows", () => {
    expect(chunkBySize(["aaaa", "bbbb", "cccc"], 15)).toEqual([["aaaa", "bbbb"], ["cccc"]])
    expect(chunkBySize(["a-very-long-row"], 5)).toEqual([["a-very-long-row"]])
    expect(chunkBySize([], 5)).toEqual([])
  })
})

const checkRow = (table: LegacyTable, fields: Fields) => checkValue(schema.tables[table].validator, fields)

describe("empty strings", () => {
  const blankStyles = {
    foodItems: [{ ...raw.foodItems[0], serviceStyle: "" }, { ...raw.foodItems[0], legacyId: "f-2", serviceStyle: "Plated" }],
    beverageItems: [{ ...raw.beverageItems[0], serviceStyle: "" }],
  }

  it("become null for optional enum fields listed in emptyAsNull, and nowhere else", () => {
    const data = legacyData(blankStyles)
    expect(data.foodItems.map((row) => row.fields.serviceStyle)).toEqual([null, "Plated"])
    expect(data.beverageItems[0].fields.serviceStyle).toBeNull()
    // Other text fields keep their '' (whatGoesOnCarts is free text).
    expect(legacyData({ cartDetails: [{ ...raw.cartDetails[0], whatGoesOnCarts: "" }, raw.cartDetails[1]] }).cartDetails[0].fields.whatGoesOnCarts).toBe("")
    expect(findSchemaProblems(data, checkRow)).toEqual([])
  })

  it("import and verify against the converted value", async () => {
    const t = convexTest(schema, modules)
    const backend = backendFor(t)
    const data = legacyData(blankStyles)
    const idMap = await importLegacyData(data, backend)
    expect((await verifyLegacyImport(data, idMap, backend)).flatMap((report) => report.problems)).toEqual([])
    const docs = await backend.dump("foodItems")
    expect(docs.map((doc) => doc.serviceStyle ?? null).sort()).toEqual(["Plated", null])
  })
})

describe("checking values against a validator", () => {
  const events = (fields: Fields) => checkRow("events", { ...legacyData().events[0].fields, ...fields })

  it("accepts a converted row", () => {
    for (const spec of LEGACY_TABLES) for (const row of legacyData()[spec.table]) expect(checkRow(spec.table, row.fields)).toEqual([])
    expect(findSchemaProblems(legacyData(), checkRow)).toEqual([])
  })

  it("names the field and the allowed literals", () => {
    expect(events({ status: "archived" })).toEqual([
      'status: "archived" is not one of "new_lead", "tentative", "confirmed", "closed", "lost"',
    ])
    expect(findSchemaProblems(legacyData({ foodItems: [{ ...raw.foodItems[0], serviceStyle: "Sit-down" }] }), checkRow))
      .toEqual(['foodItems f-1: serviceStyle: "Sit-down" is not one of "Buffet", "Family-Style", "Plated", "Passed"'])
  })

  it("rejects wrong types, missing required fields and unknown fields", () => {
    expect(events({ title: 5 })).toEqual(["title: 5 is not a string"])
    expect(events({ isInternal: "yes" })).toEqual(["isInternal: \"yes\" is not a number"])
    expect(events({ title: undefined })).toEqual(["title: required field is missing"])
    expect(events({ colour: "red" })).toEqual(["colour: unknown field"])
    expect(checkRow("cartDetails", { ...legacyData().cartDetails[0].fields, customGrid: [[1], ["a", {}]] }))
      .toEqual(["customGrid[1][1]: {} is not one of number, string, null"])
  })

  it("allows absent optional (audit) fields, validates them when present, and treats references as IDs", () => {
    expect(events({})).toEqual([])
    expect(events({ createdBy: "someone" })).toEqual([])
    expect(events({ createdBy: 3 })).toEqual(["createdBy: 3 is not an ID"])
    expect(checkRow("payments", { ...legacyData().payments[0].fields, eventId: "ev-1" })).toEqual([])
    expect(checkRow("payments", { ...legacyData().payments[0].fields, eventId: "" })).toEqual(['eventId: "" is not an ID'])
  })

  it("accepts null only where the field is nullable", () => {
    expect(events({ minGuests: null })).toEqual([])
    expect(events({ title: null })).toEqual(["title: null is not a string"])
  })

  it("fails loudly on a validator kind it doesn't support", () => {
    expect(() => checkValue({ kind: "any" }, 1)).toThrow(/unsupported validator kind "any"/)
    expect(() => checkValue({ kind: "object", fields: { blob: { kind: "bytes" } } }, { blob: 1 }, "doc")).toThrow(/"bytes" at doc\.blob/)
  })
})

describe("importing into Convex", () => {
  it("imports every row with rewritten references and verifies clean", async () => {
    const t = convexTest(schema, modules)
    const backend = backendFor(t)
    const data = legacyData()
    const idMap = await importLegacyData(data, backend)

    const reports = await verifyLegacyImport(data, idMap, backend)
    expect(reports.every((report) => report.problems.length === 0 && report.source === report.target)).toBe(true)
    expect(reports.find((report) => report.table === "eventContacts")).toEqual({ table: "eventContacts", source: 2, target: 2, problems: [] })

    const eventId = idMap.get("events:ev-1") as Id<"events">
    const barId = idMap.get("timeblocks:tb-bar") as Id<"timeblocks">
    await t.run(async (ctx) => {
      const event = await ctx.db.get("events", eventId)
      expect(event).toMatchObject({ title: "Smith Wedding", createdAt: "1767225600000", updatedAt: "1767312000000" })
      expect(event).not.toHaveProperty("createdBy")
      const [link] = await ctx.db.query("beverageItemTimeblocks").collect()
      expect(link).toMatchObject({ beverageItemId: idMap.get("beverageItems:b-1"), timeblockId: barId })
      const [food] = await ctx.db.query("foodItems").collect()
      expect(food.timeblockId).toBe(idMap.get("timeblocks:tb-food"))
      const vendor = (await ctx.db.query("eventContacts").collect()).find((row) => row.role === "vendor")
      expect(vendor).toMatchObject({ contactId: idMap.get("contacts:c-2"), vendorCategoryId: idMap.get("vendorCategories:vc-1"), isPrimary: false })
    })
  })

  it("imported records work with the app's own queries", async () => {
    const t = convexTest(schema, modules)
    const idMap = await importLegacyData(legacyData(), backendFor(t))
    const asStaff = t.withIdentity(companyIdentity)
    const eventId = idMap.get("events:ev-1") as Id<"events">

    const panel = await asStaff.query(api.eventContacts.getPanel, { eventId })
    expect(panel.groups.find((group) => group.role === "client")?.items[0]).toMatchObject({ displayName: "Ada Smith", isPrimary: true })
    expect(await asStaff.query(api.payments.getByEventId, { eventId })).toHaveLength(1)
    expect(await asStaff.query(api.beverageItems.getByEventId, { eventId })).toMatchObject({ items: [expect.objectContaining({ name: "House Red" })] })
  })

  it("refuses a deployment that already has data, and leaves it untouched", async () => {
    const t = convexTest(schema, modules)
    await importLegacyData(legacyData(), backendFor(t))
    await expect(importLegacyData(legacyData(), backendFor(t))).rejects.toThrow(/already has data in: events, contacts/)
    expect(await t.run((ctx) => ctx.db.query("events").collect())).toHaveLength(2)
  })

  it("refuses broken source references before writing anything", async () => {
    const t = convexTest(schema, modules)
    await expect(importLegacyData(legacyData({ foodItems: [{ ...raw.foodItems[0], timeblockId: "tb-gone" }] }), backendFor(t)))
      .rejects.toThrow(/broken references/)
    expect(await t.query(internal.legacyImport.nonEmptyTables, {})).toEqual([])
  })

  it("refuses to write unless the deployment has enabled the import", async () => {
    vi.stubEnv("EVENT_HORIZON_LEGACY_IMPORT", undefined)
    const t = convexTest(schema, modules)
    await expect(t.mutation(internal.legacyImport.insertBatch, { table: "events", docs: [] })).rejects.toThrow(/disabled/)
  })

  it("rejects rows the Convex schema doesn't accept", async () => {
    const t = convexTest(schema, modules)
    await expect(importLegacyData(legacyData({ events: [{ ...raw.events[0], status: "archived" }], tournamentDetails: [], cartDetails: [], payments: [],
      touchpoints: [], menuOfChargeItems: [], timeblocks: [], foodItems: [], beverageItems: [], beverageItemTimeblocks: [], eventContacts: [] }), backendFor(t)))
      .rejects.toThrow()
  })

  it("verification reports changed fields, missing rows and changed links", async () => {
    const t = convexTest(schema, modules)
    const backend = backendFor(t)
    const data = legacyData()
    const idMap = await importLegacyData(data, backend)
    await t.run(async (ctx) => {
      await ctx.db.patch("payments", idMap.get("payments:p-1") as Id<"payments">, { amountCents: 1 })
      await ctx.db.delete("touchpoints", idMap.get("touchpoints:t-1") as Id<"touchpoints">)
      const [link] = await ctx.db.query("beverageItemTimeblocks").collect()
      await ctx.db.patch("beverageItemTimeblocks", link._id, { timeblockId: idMap.get("timeblocks:tb-food") as Id<"timeblocks"> })
    })

    const problems = Object.fromEntries((await verifyLegacyImport(data, idMap, backend)).map((report) => [report.table, report.problems]))
    expect(problems.payments).toEqual(["p-1: fields differ"])
    expect(problems.touchpoints).toEqual(["expected 1 documents, found 0", "t-1: missing"])
    expect(problems.beverageItemTimeblocks).toEqual(["link rows differ"])
    expect(problems.events).toEqual([])
  })
})
