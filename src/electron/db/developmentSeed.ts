import { events, foodItems, payments, timeblocks, touchpoints } from "./schema.js"
import type { AppDatabase, SqliteConnection } from "./factory.js"

const seedIds = {
  tournamentEvent: "00000000-0000-4000-8000-000000000001",
  weddingEvent: "00000000-0000-4000-8000-000000000002",
  foodBlock: "00000000-0000-4000-8000-000000000003",
  foodItem: "00000000-0000-4000-8000-000000000004",
  payment: "00000000-0000-4000-8000-000000000005",
  touchpoint: "00000000-0000-4000-8000-000000000006",
} as const

function futureDate(daysFromNow: number, hour: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysFromNow)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

/** Synthetic examples are inserted only when the app creates a new worktree database. */
export function seedDevelopmentDatabase(database: AppDatabase, sqlite: SqliteConnection): void {
  const seed = sqlite.transaction(() => {
    // BEGIN IMMEDIATE makes the marker check and inserts one serialized operation
    // across app processes that open the same fresh worktree database.
    const alreadySeeded = sqlite
      .prepare("SELECT 1 FROM events WHERE id = ? LIMIT 1")
      .get(seedIds.tournamentEvent)
    if (alreadySeeded) return

    const now = new Date().toISOString()

    database.insert(events).values([
      {
        id: seedIds.tournamentEvent,
        title: "Sample Charity Tournament",
        type: "tournament",
        status: "planning",
        startDateTime: futureDate(30, 13),
        endDateTime: futureDate(30, 21),
        clientName: "Sample Organizer",
        clientEmail: "organizer@example.test",
        minGuests: 80,
        maxGuests: 120,
        createdAt: now,
      },
      {
        id: seedIds.weddingEvent,
        title: "Sample Wedding Reception",
        type: "wedding",
        status: "new_lead",
        startDateTime: futureDate(60, 17),
        endDateTime: futureDate(61, 1),
        clientName: "Sample Couple",
        clientEmail: "couple@example.test",
        maxGuests: 90,
        createdAt: now,
      },
    ]).run()
    database.insert(timeblocks).values({
      id: seedIds.foodBlock,
      eventId: seedIds.tournamentEvent,
      title: "Sample Buffet Dinner",
      sectionType: "food",
      time: "18:00",
      createdAt: now,
    }).run()
    database.insert(foodItems).values({
      id: seedIds.foodItem,
      timeblockId: seedIds.foodBlock,
      name: "Sample Dinner Buffet",
      quantity: 100,
      serviceStyle: "Buffet",
    }).run()
    database.insert(payments).values({
      id: seedIds.payment,
      eventId: seedIds.tournamentEvent,
      amountCents: 50000,
      date: now.slice(0, 10),
      notes: "Sample deposit",
      createdAt: now,
    }).run()
    database.insert(touchpoints).values({
      id: seedIds.touchpoint,
      eventId: seedIds.weddingEvent,
      title: "Confirm guest count",
      dueDate: futureDate(45, 0).slice(0, 10),
      createdAt: now,
    }).run()
  })

  seed.immediate()
}
