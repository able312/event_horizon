// @vitest-environment node
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { NewEvent } from "../../definitions/database.js"
import { contacts, events } from "../db/schema.js"
import { createTestDb, type TestDb } from "../db/test/testDb.js"
import { createContactsRepository } from "../db/repository/contacts.js"
import { createEventContactsRepository } from "../db/repository/eventContacts.js"
import { createEventCreationService } from "./eventCreationService.js"

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}))

describe("event creation service", () => {
  let testDb: TestDb

  beforeEach(async () => {
    testDb = await createTestDb()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  function clientsOf(eventId: string) {
    return createEventContactsRepository(testDb.db)
      .getPanel(eventId)
      .groups.find((group) => group.role === "client")!.items
  }

  it("creates an event without a client", () => {
    const event = createEventCreationService(testDb.db).create({ title: "No client" } as NewEvent)

    expect(event.title).toBe("No client")
    expect(clientsOf(event.id)).toEqual([])
  })

  it("creates the client contact and assigns them as the primary client", () => {
    const event = createEventCreationService(testDb.db).create({ title: "Smith Wedding" } as NewEvent, {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "555-0100",
    })

    expect(clientsOf(event.id)).toEqual([
      expect.objectContaining({ displayName: "Jane Smith", email: "jane@example.com", phone: "555-0100", isPrimary: true }),
    ])
  })

  it("links an existing contact with the same email instead of duplicating it", () => {
    const existing = createContactsRepository(testDb.db).create({ displayName: "Jane S.", email: "Jane@Example.com" })

    const event = createEventCreationService(testDb.db).create({ title: "Repeat client" } as NewEvent, {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    })

    expect(clientsOf(event.id)).toEqual([expect.objectContaining({ contactId: existing.id, isPrimary: true })])
    expect(testDb.db.select().from(contacts).all()).toHaveLength(1)
  })

  it("rolls back the event when the client can't be saved", () => {
    const service = createEventCreationService(testDb.db)

    expect(() => service.create({ title: "Bad client" } as NewEvent, { firstName: "Jane", email: "not-an-email" })).toThrow(
      expect.objectContaining({ code: "InvalidInput" }),
    )
    expect(testDb.db.select().from(events).all()).toEqual([])
    expect(testDb.db.select().from(contacts).all()).toEqual([])
  })
})
