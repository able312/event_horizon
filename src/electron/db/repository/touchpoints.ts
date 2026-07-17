import { and, eq, isNull } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type {
  IncompleteTouchpointWithEvent,
  NewTouchpoint,
  Touchpoint,
  UpdateTouchpoint,
} from "../../../definitions/database.js"
import { buildCommonTouchpoints, toIsoDateOnly } from "../../../lib/touchpoints/buildCommonTouchpoints.js"
import type { AppDatabase } from "../factory.js"
import { db } from "../index.js"
import { events, touchpoints } from "../schema.js"

export function createTouchpointsRepository(database: AppDatabase) {
  const repo = {
    getByEventId: (eventId: string): Touchpoint[] => {
      if (!eventId) throw new Error("getTouchpointsByEventId: eventId is required")

      return database.select().from(touchpoints).where(eq(touchpoints.eventId, eventId)).all()
    },

    getIncompleteWithEvent: (): IncompleteTouchpointWithEvent[] => {
      return database
        .select({
          id: touchpoints.id,
          eventId: touchpoints.eventId,
          title: touchpoints.title,
          dueDate: touchpoints.dueDate,
          completedAt: touchpoints.completedAt,
          createdAt: touchpoints.createdAt,
          eventTitle: events.title,
        })
        .from(touchpoints)
        .innerJoin(events, eq(touchpoints.eventId, events.id))
        .where(isNull(touchpoints.completedAt))
        .all()
    },

    getIncompleteByEventId: (eventId: string): Touchpoint[] => {
      if (!eventId) throw new Error("getIncompleteTouchpointsByEventId: eventId is required")

      return database
        .select()
        .from(touchpoints)
        .where(and(eq(touchpoints.eventId, eventId), isNull(touchpoints.completedAt)))
        .all()
    },

    insert: (
      eventId: string,
      values: Partial<Pick<NewTouchpoint, "title" | "dueDate" | "completedAt">> = {},
    ): Touchpoint => {
      if (!eventId) throw new Error("insertTouchpoint: eventId is required")

      const now = new Date().toISOString()
      const entry: NewTouchpoint = {
        id: uuidv4(),
        eventId,
        title: values.title ?? "",
        dueDate: values.dueDate ?? null,
        completedAt: values.completedAt ?? null,
        createdAt: now,
      }

      return database.insert(touchpoints).values(entry).returning().get()!
    },

    update: (id: string, updates: UpdateTouchpoint): Touchpoint => {
      if (!id) throw new Error("updateTouchpoint: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateTouchpoint: updates are required")
      }

      const updated = database
        .update(touchpoints)
        .set({ ...updates })
        .where(eq(touchpoints.id, id))
        .returning()
        .get()

      if (!updated) throw new Error(`Touchpoint not found for id ${id}`)

      return updated
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteTouchpoint: ID is required")

      const deleted = database.delete(touchpoints).where(eq(touchpoints.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Touchpoint not found for id ${id}`)

      return true
    },

    seedCommon: (eventId: string): Touchpoint[] => {
      if (!eventId) throw new Error("seedCommonTouchpoints: eventId is required")

      const event = database.select().from(events).where(eq(events.id, eventId)).get()
      if (!event) throw new Error(`Event not found for id ${eventId}`)

      const eventStart = event.startDateTime ? new Date(event.startDateTime) : new Date()
      if (Number.isNaN(eventStart.getTime())) {
        throw new Error(`Invalid event startDateTime for event ${eventId}`)
      }

      const templates = buildCommonTouchpoints(eventStart)
      return templates.map((template) =>
        repo.insert(eventId, {
          title: template.title,
          dueDate: toIsoDateOnly(template.dueDate),
        }),
      )
    },
  }

  return repo
}

const touchpointQueries = createTouchpointsRepository(db)

export default touchpointQueries
