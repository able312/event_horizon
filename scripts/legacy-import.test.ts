import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { findMissingReferences, readLegacyData, type LegacyData } from "../convex/lib/legacyImport.ts"
import { createTestDb, type TestDb } from "../src/electron/db/test/testDb.ts"
import { findDataProblems, formatReport, loadSchema, parseOptions, targetFlags } from "./legacy-import.ts"

let testDb: TestDb

beforeEach(async () => {
  testDb = await createTestDb()
})

afterEach(async () => {
  await testDb.cleanup()
})

/** One row in every table of the fully migrated SQLite schema, as the app writes them. */
function seed() {
  testDb.sqlite.exec(`
    INSERT INTO events (id, title, type, status, start_date_time, created_at, is_internal) VALUES
      ('ev-1', 'Smith Wedding', 'wedding', 'confirmed', '2026-06-01T20:00:00.000Z', '1767225600000', 0);
    INSERT INTO tournament_details (id, event_id, time, number_of_players, created_at) VALUES ('td-1', 'ev-1', '08:00', 72, '2026-01-01');
    INSERT INTO cart_details (id, event_id, layout, custom_grid, renting_carts, created_at) VALUES
      ('cd-1', 'ev-1', 'custom', '[[1,"Lead",null]]', 1, '2026-01-01');
    INSERT INTO payments (id, event_id, amount_cents, date, created_at) VALUES ('p-1', 'ev-1', 150000, '2026-03-01', '2026-03-01');
    INSERT INTO touchpoints (id, event_id, title, created_at) VALUES ('t-1', 'ev-1', 'Send contract', '2026-03-01');
    INSERT INTO menu_of_charge_items (id, event_id, name, charge_type, created_at) VALUES ('m-1', 'ev-1', 'Room rental', NULL, '2026-03-01');
    INSERT INTO timeblocks (id, event_id, title, section_type, created_at) VALUES
      ('tb-food', 'ev-1', 'Dinner', 'food', '1767225600000'),
      ('tb-bar', 'ev-1', 'Bar', 'beverage', '1767225600000');
    INSERT INTO food_items (id, timeblock_id, name) VALUES ('f-1', 'tb-food', 'Salmon');
    INSERT INTO beverage_items (id, event_id, name, type) VALUES ('b-1', 'ev-1', 'House Red', 'Wine');
    INSERT INTO beverage_item_timeblocks (beverage_item_id, timeblock_id) VALUES ('b-1', 'tb-bar');
    INSERT INTO contacts (id, kind, first_name, display_name, email, created_at, updated_at) VALUES
      ('c-1', 'individual', 'Ada', 'Ada', ' Ada@Example.com ', '2026-01-01', '2026-01-01');
    INSERT INTO vendor_categories (id, key, label, color_token, sort_order) VALUES ('vc-test', 'test-av', 'Test AV', 'blue', 99);
    INSERT INTO contact_roles (id, contact_id, role, vendor_category_id, created_at) VALUES ('r-1', 'c-1', 'vendor', 'vc-test', '2026-01-01');
    INSERT INTO event_contacts (id, event_id, contact_id, role, vendor_category_id, is_primary, sort_order, created_at, updated_at) VALUES
      ('ec-1', 'ev-1', 'c-1', 'vendor', 'vc-test', 1, 0, '2026-01-01', '2026-01-01');
  `)
}

function read(): LegacyData {
  return readLegacyData((sql) => testDb.sqlite.prepare(sql).all() as Record<string, unknown>[])
}

describe("reading the migrated SQLite schema", () => {
  it("reads every table with its columns mapped to Convex fields", () => {
    seed()
    const data = read()

    expect(data.events).toEqual([{ legacyId: "ev-1", fields: expect.objectContaining({ title: "Smith Wedding", isInternal: 0, endDateTime: null, updatedAt: null }) }])
    expect(data.cartDetails[0].fields).toMatchObject({ eventId: "ev-1", customGrid: [[1, "Lead", null]], rentingCarts: true })
    expect(data.menuOfChargeItems[0].fields).toMatchObject({ category: null, name: "Room rental" })
    expect(data.beverageItemTimeblocks).toEqual([{ legacyId: null, fields: { beverageItemId: "b-1", timeblockId: "tb-bar" } }])
    // The generated column comes across as stored.
    expect(data.contacts[0].fields).toMatchObject({ email: " Ada@Example.com ", emailNormalized: "ada@example.com" })
    expect(data.eventContacts[0].fields).toMatchObject({ isPrimary: true, vendorCategoryId: "vc-test" })
    expect(findMissingReferences(data)).toEqual([])
  })

  it("includes the default vendor categories that migrations seed", () => {
    const keys = read().vendorCategories.map((row) => row.fields.key)
    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("pre-write checks", () => {
  it("pass for rows the app writes", async () => {
    seed()
    expect(findDataProblems(read(), await loadSchema())).toEqual([])
  })

  it("report schema problems and broken references together, and convert blank service styles", async () => {
    seed()
    testDb.sqlite.exec(`
      INSERT INTO food_items (id, timeblock_id, name, service_style) VALUES ('f-blank', 'tb-food', 'Soup', ''), ('f-bad', 'tb-food', 'Pie', 'Sit-down');
      INSERT INTO payments (id, event_id, amount_cents, date, created_at) VALUES ('p-gone', 'ev-1', 1, '2026-03-02', '2026-03-02');
    `)
    testDb.sqlite.pragma("foreign_keys = OFF")
    testDb.sqlite.exec("UPDATE payments SET event_id = 'ev-gone' WHERE id = 'p-gone'")
    expect(findDataProblems(read(), await loadSchema())).toEqual([
      "payments p-gone: eventId points to missing events ev-gone",
      'foodItems f-bad: serviceStyle: "Sit-down" is not one of "Buffet", "Family-Style", "Plated", "Passed"',
    ])
  })
})

describe("CLI options", () => {
  it("requires a SQLite path and an explicit target unless dry-running", () => {
    expect(() => parseOptions([])).toThrow(/--sqlite/)
    expect(() => parseOptions(["--sqlite", "app.sqlite"])).toThrow(/--target/)
    expect(() => parseOptions(["--sqlite", "app.sqlite", "--target", "staging"])).toThrow(/local, dev or prod/)
    expect(parseOptions(["--sqlite", "app.sqlite", "--dry-run"])).toEqual({ sqlite: "app.sqlite", dryRun: true, reset: false, target: null })
    expect(parseOptions(["--sqlite", "app.sqlite", "--target", "prod"])).toEqual({ sqlite: "app.sqlite", dryRun: false, reset: false, target: "prod" })
  })

  it("runs --reset on its own against an explicit target", () => {
    expect(parseOptions(["--reset", "--target", "prod"])).toEqual({ sqlite: null, dryRun: false, reset: true, target: "prod" })
    expect(() => parseOptions(["--reset"])).toThrow(/--target/)
    expect(() => parseOptions(["--reset", "--target", "dev", "--sqlite", "app.sqlite"])).toThrow(/on its own/)
    expect(() => parseOptions(["--reset", "--target", "dev", "--dry-run"])).toThrow(/on its own/)
  })

  it("only targets the deployment this checkout selects", () => {
    const local = "CONVEX_DEPLOYMENT=local:local-jboddy07-event_horizon\n"
    const cloud = "CONVEX_DEPLOYMENT=dev:glorious-cat-123 # team\n"
    expect(targetFlags("local", local, "/x/.env.local")).toEqual(["--env-file", "/x/.env.local"])
    expect(targetFlags("local", "CONVEX_DEPLOYMENT=anonymous:anonymous-agent\n", "/x/.env.local")).toEqual(["--env-file", "/x/.env.local"])
    expect(targetFlags("dev", cloud, "/x/.env.local")).toEqual(["--env-file", "/x/.env.local"])
    expect(targetFlags("prod", cloud, "/x/.env.local")).toEqual(["--env-file", "/x/.env.local", "--prod"])
    expect(() => targetFlags("local", cloud, "/x")).toThrow(/needs a local deployment/)
    expect(() => targetFlags("dev", local, "/x")).toThrow(/cloud dev deployment/)
    expect(() => targetFlags("prod", local, "/x")).toThrow(/cloud dev deployment/)
    expect(() => targetFlags("prod", `${cloud}CONVEX_DEPLOY_KEY=secret\n`, "/x")).toThrow(/overrides/)
  })

  it("formats the verification report", () => {
    expect(formatReport([
      { table: "events", source: 2, target: 2, problems: [] },
      { table: "payments", source: 1, target: 0, problems: ["p-1: missing"] },
    ])).toBe([
      "events    sqlite     2  convex     2  ok",
      "payments  sqlite     1  convex     0  1 problem(s)",
      "    p-1: missing",
    ].join("\n"))
  })
})
