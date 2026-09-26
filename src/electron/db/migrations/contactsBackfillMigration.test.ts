// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it, vi } from "vitest"

import { runMigrations } from "../factory.js"
import { createMigrationsFolderBefore, MIGRATIONS_FOLDER } from "../test/migrationsFolder.js"
import { createTestDb, type TestDb } from "../test/testDb.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

type Sqlite = TestDb["sqlite"]

type ContactRow = {
  id: string
  kind: string
  firstName: string | null
  lastName: string | null
  organizationName: string | null
  displayName: string
  email: string | null
  phone: string | null
}

type AssignmentRow = {
  eventId: string
  contactId: string
  role: string
  categoryKey: string | null
  isPrimary: number
  roleLabel: string | null
  notes: string | null
  sortOrder: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

async function createPreBackfillDb(): Promise<TestDb> {
  const preMigration = await createMigrationsFolderBefore("0019_contacts_backfill")
  try {
    return await createTestDb({ migrationsFolder: preMigration.folder })
  } finally {
    await preMigration.cleanup()
  }
}

function insertEvent(
  sqlite: Sqlite,
  id: string,
  client: { name?: string | null; email?: string | null; phone?: string | null } = {},
) {
  sqlite
    .prepare(
      "INSERT INTO events (id, title, client_name, client_email, client_phone, created_at) VALUES (?, ?, ?, ?, ?, 'created')",
    )
    .run(id, `Event ${id}`, client.name ?? null, client.email ?? null, client.phone ?? null)
}

function insertVendor(
  sqlite: Sqlite,
  id: string,
  eventId: string,
  block: { title?: string; time?: string | null; details?: string | null; assignedTo?: string | null; createdAt?: string },
  contact: { name?: string; email?: string; phone?: string } | null,
) {
  sqlite
    .prepare(
      "INSERT INTO timeblocks (id, event_id, title, time, details, section_type, assigned_to, created_at) VALUES (?, ?, ?, ?, ?, 'vendor', ?, ?)",
    )
    .run(
      id,
      eventId,
      block.title ?? "",
      block.time ?? null,
      block.details ?? null,
      block.assignedTo ?? null,
      block.createdAt ?? "2026-01-01T00:00:00.000Z",
    )
  if (!contact) return
  sqlite
    .prepare(
      "INSERT INTO vendor_items (id, timeblock_id, contact_name, contact_phone, contact_email) VALUES (?, ?, ?, ?, ?)",
    )
    .run(`vi-${id}`, id, contact.name ?? "", contact.phone ?? "", contact.email ?? "")
}

function allContacts(sqlite: Sqlite): ContactRow[] {
  return sqlite
    .prepare(
      `SELECT id, kind, first_name AS firstName, last_name AS lastName, organization_name AS organizationName,
        display_name AS displayName, email, phone
      FROM contacts ORDER BY display_name`,
    )
    .all() as ContactRow[]
}

function contactByName(sqlite: Sqlite, displayName: string): ContactRow {
  const rows = allContacts(sqlite).filter((row) => row.displayName === displayName)
  expect(rows).toHaveLength(1)
  return rows[0]!
}

function assignments(sqlite: Sqlite, eventId: string): AssignmentRow[] {
  return sqlite
    .prepare(
      `SELECT ec.event_id AS eventId, ec.contact_id AS contactId, ec.role, vc.key AS categoryKey,
        ec.is_primary AS isPrimary, ec.role_label AS roleLabel, ec.notes, ec.sort_order AS sortOrder
      FROM event_contacts ec
      LEFT JOIN vendor_categories vc ON vc.id = ec.vendor_category_id
      WHERE ec.event_id = ? AND ec.removed_at IS NULL
      ORDER BY ec.role, ec.is_primary DESC, ec.sort_order`,
    )
    .all(eventId) as AssignmentRow[]
}

function standingRoles(sqlite: Sqlite, contactId: string): string[] {
  return (
    sqlite
      .prepare(
        `SELECT cr.role || coalesce(':' || vc.key, '') AS role
        FROM contact_roles cr
        LEFT JOIN vendor_categories vc ON vc.id = cr.vendor_category_id
        WHERE cr.contact_id = ?
        ORDER BY role`,
      )
      .all(contactId) as { role: string }[]
  ).map((row) => row.role)
}

function columnNames(sqlite: Sqlite, table: string): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((column) => column.name)
}

function tableExists(sqlite: Sqlite, name: string): boolean {
  return Boolean(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
}

describe("0019_contacts_backfill migration", () => {
  let testDb: TestDb | null = null

  afterEach(async () => {
    await testDb?.cleanup()
    testDb = null
  })

  it("moves each event's client into a primary client contact and drops the client columns", async () => {
    testDb = await createPreBackfillDb()
    const { sqlite } = testDb
    insertEvent(sqlite, "e1", { name: "  Jamie Lee Smith ", email: " Jamie@Example.com ", phone: "555-0100" })
    insertEvent(sqlite, "e2", { name: "Madonna" })
    insertEvent(sqlite, "e3", { phone: "555-0199" })
    insertEvent(sqlite, "e4", { name: "  ", email: "", phone: null })

    runMigrations(testDb.db, MIGRATIONS_FOLDER)

    expect(columnNames(sqlite, "events").filter((name) => name.startsWith("client_"))).toEqual(["client_notes"])

    const jamie = contactByName(sqlite, "Jamie Lee Smith")
    expect(jamie).toMatchObject({
      kind: "individual",
      firstName: "Jamie",
      lastName: "Lee Smith",
      organizationName: null,
      email: "Jamie@Example.com",
      phone: "555-0100",
    })
    expect(jamie.id).toMatch(UUID_PATTERN)
    expect(standingRoles(sqlite, jamie.id)).toEqual(["client"])
    expect(assignments(sqlite, "e1")).toEqual([
      expect.objectContaining({ contactId: jamie.id, role: "client", categoryKey: null, isPrimary: 1, notes: null }),
    ])

    expect(contactByName(sqlite, "Madonna")).toMatchObject({ firstName: "Madonna", lastName: null })

    // Phone-only clients still get a contact, named by their phone
    const phoneOnly = contactByName(sqlite, "555-0199")
    expect(phoneOnly).toMatchObject({ firstName: null, lastName: null, phone: "555-0199" })
    expect(assignments(sqlite, "e3")).toEqual([expect.objectContaining({ contactId: phoneOnly.id, isPrimary: 1 })])

    // Blank client fields don't create a contact
    expect(assignments(sqlite, "e4")).toEqual([])
    expect(allContacts(sqlite)).toHaveLength(3)
    expect(sqlite.pragma("foreign_key_check")).toEqual([])
  })

  it("merges contacts that share an email but never merges contacts without one", async () => {
    testDb = await createPreBackfillDb()
    const { sqlite } = testDb
    insertEvent(sqlite, "e1", { name: "Sam Rivera", email: "sam@example.com" })
    insertEvent(sqlite, "e2", { name: "Samantha Rivera", email: " SAM@example.com" })
    insertEvent(sqlite, "e3", { name: "Chris Park" })
    insertEvent(sqlite, "e4", { name: "Chris Park" })
    insertVendor(sqlite, "tb-1", "e3", { title: "Rivera Photo" }, { name: "Sam Rivera", email: "sam@EXAMPLE.com" })

    runMigrations(testDb.db, MIGRATIONS_FOLDER)

    // Client details win over vendor details, then the first event
    const sam = contactByName(sqlite, "Sam Rivera")
    expect(sam.email).toBe("sam@example.com")
    expect(allContacts(sqlite).filter((row) => row.email?.toLowerCase().includes("sam@"))).toHaveLength(1)
    expect(standingRoles(sqlite, sam.id)).toEqual(["client", "vendor:other"])

    expect(assignments(sqlite, "e1")).toEqual([expect.objectContaining({ contactId: sam.id, role: "client" })])
    expect(assignments(sqlite, "e2")).toEqual([expect.objectContaining({ contactId: sam.id, role: "client" })])

    const chrisIds = allContacts(sqlite).filter((row) => row.displayName === "Chris Park").map((row) => row.id)
    expect(new Set(chrisIds).size).toBe(2)
    expect(assignments(sqlite, "e3").map((row) => [row.role, row.contactId])).toEqual([
      ["client", expect.any(String)],
      ["vendor", sam.id],
    ])
  })

  it("turns vendor timeblocks into vendor contacts and drops vendor_items", async () => {
    testDb = await createPreBackfillDb()
    const { sqlite } = testDb
    insertEvent(sqlite, "e1")
    insertVendor(
      sqlite,
      "tb-dj",
      "e1",
      { title: "Beat Co", time: "18:30", details: "Needs two outlets", assignedTo: "Alex", createdAt: "2026-01-02" },
      { name: "Dana DJ", email: "dana@beat.co", phone: "555-0200" },
    )
    insertVendor(sqlite, "tb-tent", "e1", { title: "Tent Rentals", createdAt: "2026-01-01" }, { phone: "555-0300" })
    insertVendor(sqlite, "tb-blank", "e1", { title: "  ", createdAt: "2026-01-03" }, {})
    insertVendor(sqlite, "tb-orphan", "e1", { title: "Florist", details: "Arrives 3pm", createdAt: "2026-01-04" }, null)
    sqlite
      .prepare(
        "INSERT INTO timeblocks (id, event_id, title, section_type, created_at) VALUES ('tb-note', 'e1', 'Keep me', 'note', 'created')",
      )
      .run()

    runMigrations(testDb.db, MIGRATIONS_FOLDER)

    const dana = contactByName(sqlite, "Dana DJ")
    expect(dana).toMatchObject({
      kind: "individual",
      firstName: "Dana",
      lastName: "DJ",
      organizationName: "Beat Co",
      email: "dana@beat.co",
      phone: "555-0200",
    })
    const tent = contactByName(sqlite, "Tent Rentals")
    expect(tent).toMatchObject({ kind: "organization", firstName: null, organizationName: "Tent Rentals", phone: "555-0300" })
    const florist = contactByName(sqlite, "Florist")
    expect(florist).toMatchObject({ kind: "organization", email: null, phone: null })

    expect(assignments(sqlite, "e1")).toEqual([
      {
        eventId: "e1",
        contactId: tent.id,
        role: "vendor",
        categoryKey: "other",
        isPrimary: 0,
        roleLabel: "Tent Rentals",
        notes: null,
        sortOrder: 0,
      },
      {
        eventId: "e1",
        contactId: dana.id,
        role: "vendor",
        categoryKey: "other",
        isPrimary: 0,
        roleLabel: "Beat Co",
        notes: "Time: 18:30\nAssigned to: Alex\nNeeds two outlets",
        sortOrder: 1,
      },
      expect.objectContaining({ contactId: florist.id, notes: "Arrives 3pm", sortOrder: 2 }),
    ])
    // The never-filled-in vendor row is dropped
    expect(allContacts(sqlite)).toHaveLength(3)
    expect(standingRoles(sqlite, dana.id)).toEqual(["vendor:other"])

    expect(tableExists(sqlite, "vendor_items")).toBe(false)
    expect(sqlite.prepare("SELECT id FROM timeblocks ORDER BY id").all()).toEqual([{ id: "tb-note" }])
    expect(sqlite.pragma("foreign_key_check")).toEqual([])
  })

  it("collapses one vendor listed twice on the same event into a single assignment", async () => {
    testDb = await createPreBackfillDb()
    const { sqlite } = testDb
    insertEvent(sqlite, "e1")
    insertVendor(sqlite, "tb-1", "e1", { title: "Setup", time: "08:00", createdAt: "2026-01-01" }, { name: "Pat Rentals", email: "pat@rent.al" })
    insertVendor(sqlite, "tb-2", "e1", { title: "Teardown", time: "23:00", createdAt: "2026-01-02" }, { name: "Pat Rentals", email: "pat@rent.al" })

    runMigrations(testDb.db, MIGRATIONS_FOLDER)

    const pat = contactByName(sqlite, "Pat Rentals")
    expect(assignments(sqlite, "e1")).toEqual([
      expect.objectContaining({
        contactId: pat.id,
        roleLabel: "Setup / Teardown",
        notes: "Time: 08:00\n\nTime: 23:00",
        sortOrder: 0,
      }),
    ])
  })

  it("reuses active contacts with a matching email and keeps an existing primary client", async () => {
    testDb = await createPreBackfillDb()
    const { sqlite } = testDb
    const now = "2026-09-01T00:00:00.000Z"
    sqlite
      .prepare(
        "INSERT INTO contacts (id, first_name, display_name, email, created_at, updated_at) VALUES ('existing', 'Taylor', 'Taylor Existing', 'taylor@example.com', ?, ?)",
      )
      .run(now, now)
    sqlite
      .prepare(
        "INSERT INTO contacts (id, display_name, email, archived_at, created_at, updated_at) VALUES ('archived', 'Old Morgan', 'morgan@example.com', ?, ?, ?)",
      )
      .run(now, now, now)
    sqlite
      .prepare(
        "INSERT INTO contacts (id, display_name, created_at, updated_at) VALUES ('already-primary', 'Already Primary', ?, ?)",
      )
      .run(now, now)
    insertEvent(sqlite, "e1", { name: "Taylor New Name", email: "TAYLOR@example.com" })
    insertEvent(sqlite, "e2", { name: "Morgan Lane", email: "morgan@example.com" })
    sqlite
      .prepare(
        "INSERT INTO event_contacts (id, event_id, contact_id, role, is_primary, created_at, updated_at) VALUES ('ec-existing', 'e2', 'already-primary', 'client', 1, ?, ?)",
      )
      .run(now, now)

    runMigrations(testDb.db, MIGRATIONS_FOLDER)

    // The existing contact is linked as-is, not overwritten
    expect(contactByName(sqlite, "Taylor Existing").id).toBe("existing")
    expect(allContacts(sqlite).some((row) => row.displayName === "Taylor New Name")).toBe(false)
    expect(assignments(sqlite, "e1")).toEqual([expect.objectContaining({ contactId: "existing", isPrimary: 1 })])
    expect(standingRoles(sqlite, "existing")).toEqual(["client"])

    // Archived contacts don't claim the email, so a new contact is created
    const morgan = contactByName(sqlite, "Morgan Lane")
    expect(morgan.id).not.toBe("archived")
    expect(assignments(sqlite, "e2").map((row) => [row.contactId, row.isPrimary])).toEqual([
      ["already-primary", 1],
      [morgan.id, 0],
    ])
  })
})
