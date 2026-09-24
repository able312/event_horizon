import { randomUUID } from "node:crypto"
import { events, foodItems, payments, timeblocks, touchpoints } from "./schema.js"
import type { AppDatabase } from "./factory.js"

function futureDate(daysFromNow: number, hour: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysFromNow)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

/** Synthetic examples are inserted only when the app creates a new worktree database. */
export function seedDevelopmentDatabase(database: AppDatabase): void {
  const now = new Date().toISOString()
  const tournamentId = randomUUID()
  const weddingId = randomUUID()
  const foodBlockId = randomUUID()

  database.transaction((tx) => {
    tx.insert(events).values([
      {
        id: tournamentId,
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
        id: weddingId,
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
    tx.insert(timeblocks).values({
      id: foodBlockId,
      eventId: tournamentId,
      title: "Sample Buffet Dinner",
      sectionType: "food",
      time: "18:00",
      createdAt: now,
    }).run()
    tx.insert(foodItems).values({
      id: randomUUID(),
      timeblockId: foodBlockId,
      name: "Sample Dinner Buffet",
      quantity: 100,
      serviceStyle: "Buffet",
    }).run()
    tx.insert(payments).values({
      id: randomUUID(),
      eventId: tournamentId,
      amountCents: 50000,
      date: now.slice(0, 10),
      notes: "Sample deposit",
      createdAt: now,
    }).run()
    tx.insert(touchpoints).values({
      id: randomUUID(),
      eventId: weddingId,
      title: "Confirm guest count",
      dueDate: futureDate(45, 0).slice(0, 10),
      createdAt: now,
    }).run()
  })
}
