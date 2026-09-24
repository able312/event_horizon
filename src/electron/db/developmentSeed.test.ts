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

  const events = testDb.sqlite.prepare("SELECT id, title, client_email FROM events ORDER BY title").all() as { id: string; title: string; client_email: string }[]
  expect(events.map((event) => event.title)).toEqual(["Sample Charity Tournament", "Sample Wedding Reception"])
  expect(events.every((event) => event.client_email.endsWith("@example.test"))).toBe(true)
  expect(testDb.sqlite.prepare("SELECT count(*) AS count FROM food_items").get()).toEqual({ count: 1 })
  expect(testDb.sqlite.prepare("SELECT count(*) AS count FROM payments").get()).toEqual({ count: 1 })
  expect(testDb.sqlite.pragma("foreign_key_check")).toEqual([])
})
