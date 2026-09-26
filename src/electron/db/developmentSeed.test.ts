// @vitest-environment node
import { afterEach, expect, it } from "vitest"
import { createTestDb, type TestDb } from "./test/testDb.js"
import { seedDevelopmentDatabase } from "./developmentSeed.js"

let testDb: TestDb | undefined

afterEach(async () => {
  await testDb?.cleanup()
  testDb = undefined
})

it("seeds related synthetic records once when startup is retried", async () => {
  testDb = await createTestDb()
  seedDevelopmentDatabase(testDb.db, testDb.sqlite)
  seedDevelopmentDatabase(testDb.db, testDb.sqlite)

  const events = testDb.sqlite.prepare(`
    SELECT e.title, c.email AS client_email
    FROM events e
    LEFT JOIN event_contacts ec ON ec.event_id = e.id AND ec.role = 'client' AND ec.is_primary = 1
    LEFT JOIN contacts c ON c.id = ec.contact_id
    ORDER BY e.title
  `).all() as { title: string; client_email: string | null }[]
  expect(events.map((event) => event.title)).toEqual(["Sample Charity Tournament", "Sample Wedding Reception"])
  expect(events.every((event) => event.client_email?.endsWith("@example.test"))).toBe(true)
  expect(testDb.sqlite.prepare("SELECT count(*) AS count FROM food_items").get()).toEqual({ count: 1 })
  expect(testDb.sqlite.prepare("SELECT count(*) AS count FROM payments").get()).toEqual({ count: 1 })
  expect(testDb.sqlite.pragma("foreign_key_check")).toEqual([])
})
