import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { contacts, eventContacts, events } from "../schema.js"
import type { Event, EventStatus, NewEvent, UpdateEvent } from "../../../definitions/database.js"
import type { EventSearchRequest, EventSearchResponse } from "../../../definitions/ipc.js"
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { assertValidEventDateRange } from "../../../lib/events/eventDateRange.js"

export function createEventsRepository(database: AppDatabase) {
  const toInsertEntry = (data: NewEvent, createdAtOverride?: string): NewEvent => {
    const now = createdAtOverride ?? Date.now().toString()
    const startDateTime = data.startDateTime ?? null
    const endDateTime = data.endDateTime ?? null
    assertValidEventDateRange(startDateTime, endDateTime)

    return {
      ...data,
      id: uuidv4(),
      title: data.title ?? "",
      type: data.type ?? "function",
      status: data.status ?? "new_lead",
      isInternal: data.isInternal ?? 0,
      startDateTime,
      endDateTime,
      minGuests: data.minGuests ?? null,
      maxGuests: data.maxGuests ?? null,
      guestCountFinal: data.guestCountFinal ?? null,
      driveFolderId: data.driveFolderId ?? null,
      calendarId: data.calendarId ?? null,
      clientNotes: data.clientNotes ?? null,
      internalNotes: data.internalNotes ?? null,
      createdAt: now,
      updatedAt: null,
    }
  }

  const eventQueries = {
    getAll: (): Event[] => {
      return database.select().from(events).all()
    },

    getById: (id: string): Event => {
      if (!id) throw new Error("getEventById: ID is required")

      const event = database.select().from(events).where(eq(events.id, id)).get()
      if (!event) throw new Error(`Event not found for id ${id}`)

      return event
    },

    getByStatus: (status: EventStatus): Event[] => {
      return database.select().from(events).where(eq(events.status, status)).all()
    },

    getByMonthRange: (startInclusiveIso: string, endExclusiveIso: string): Event[] => {
      if (!startInclusiveIso) {
        throw new Error("getByMonthRange: startInclusiveIso is required")
      }
      if (!endExclusiveIso) {
        throw new Error("getByMonthRange: endExclusiveIso is required")
      }

      return database.select().from(events).where(and(
        isNotNull(events.startDateTime),
        gte(events.startDateTime, startInclusiveIso),
        lt(events.startDateTime, endExclusiveIso),
      )).orderBy(asc(events.startDateTime)).all()
    },

    getUnscheduled: (): Event[] => {
      return database.select().from(events).where(
        isNull(events.startDateTime),
      ).orderBy(asc(events.createdAt)).all()
    },

    getScheduled: (): Event[] => {
      return database.select().from(events).where(
        isNotNull(events.startDateTime),
      ).all()
    },

    getByCalendarIds: (calendarIds: string[]): Event[] => {
      const normalizedIds = calendarIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

      if (normalizedIds.length === 0) return []

      return database.select().from(events).where(
        and(
          isNotNull(events.calendarId),
          inArray(events.calendarId, normalizedIds),
        ),
      ).all()
    },

    search: (params: EventSearchRequest): EventSearchResponse => {
      const query = params.query.trim().toLowerCase()
      if (query.length < 2) {
        throw new Error("searchEvents: query must be at least 2 characters")
      }

      const page = Math.max(0, Math.floor(params.page))
      const pageSize = Math.min(50, Math.max(1, Math.floor(params.pageSize)))
      const startFrom = params.startFrom?.trim() || null
      const startTo = params.startTo?.trim() || null

      if (startFrom && Number.isNaN(Date.parse(startFrom))) {
        throw new Error("searchEvents: startFrom must be a valid ISO datetime")
      }
      if (startTo && Number.isNaN(Date.parse(startTo))) {
        throw new Error("searchEvents: startTo must be a valid ISO datetime")
      }
      if (startFrom && startTo && startFrom >= startTo) {
        throw new Error("searchEvents: startFrom must be before startTo")
      }

      const escaped = query.replaceAll("%", "\\%").replaceAll("_", "\\_")
      const startsWithPattern = `${escaped}%`
      const containsPattern = `%${escaped}%`

      const normalizedTitle = sql`lower(coalesce(${events.title}, ''))`
      const normalizedClientName = sql`lower(${contacts.displayName})`
      const normalizedClientEmail = sql`lower(coalesce(${contacts.email}, ''))`
      const normalizedClientPhone = sql`lower(coalesce(${contacts.phone}, ''))`

      // Client details live on contacts; match any active client assigned to the event
      const hasClientMatching = (condition: SQL) => sql<boolean>`exists (
        select 1 from ${eventContacts}
        inner join ${contacts} on ${contacts.id} = ${eventContacts.contactId}
        where ${eventContacts.eventId} = ${events.id}
          and ${eventContacts.role} = 'client'
          and ${eventContacts.removedAt} is null
          and ${condition}
      )`

      const titleStartsWith = sql<boolean>`${normalizedTitle} like ${startsWithPattern}`
      const titleContains = sql<boolean>`${normalizedTitle} like ${containsPattern}`
      const clientNameStartsWith = hasClientMatching(sql`${normalizedClientName} like ${startsWithPattern}`)
      const clientContains = hasClientMatching(sql`(
        ${normalizedClientName} like ${containsPattern}
        or ${normalizedClientEmail} like ${containsPattern}
        or ${normalizedClientPhone} like ${containsPattern}
      )`)

      const whereClauses = [
        or(titleContains, clientContains),
      ]

      if (params.type) whereClauses.push(eq(events.type, params.type))
      if (params.status) whereClauses.push(eq(events.status, params.status))

      if (startFrom || startTo) {
        whereClauses.push(isNotNull(events.startDateTime))
      }
      if (startFrom) {
        whereClauses.push(gte(events.startDateTime, startFrom))
      }
      if (startTo) {
        whereClauses.push(lt(events.startDateTime, startTo))
      }

      const rankCase = sql<number>`
        case
          when ${titleStartsWith} then 1
          when ${titleContains} then 2
          when ${clientNameStartsWith} then 3
          else 4
        end
      `

      const whereExpression = and(...whereClauses)
      const totalResult = database
        .select({ value: sql<number>`count(*)` })
        .from(events)
        .where(whereExpression)
        .get()
      const total = totalResult?.value ?? 0

      const items = database
        .select()
        .from(events)
        .where(whereExpression)
        .orderBy(
          rankCase,
          sql`case when ${events.startDateTime} is null then 1 else 0 end`,
          asc(events.startDateTime),
          asc(events.createdAt),
          asc(events.id),
        )
        .limit(pageSize)
        .offset(page * pageSize)
        .all()

      return {
        items,
        total,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < total,
      }
    },

    insert: (data: NewEvent): Event => {
      const eventEntry = toInsertEntry(data)

      return database.insert(events).values(eventEntry).returning().get()!
    },

    insertMany: (data: NewEvent[]): Event[] => {
      if (data.length === 0) return []

      const createdAt = Date.now().toString()
      const rows = data.map((event) => toInsertEntry(event, createdAt))

      return database.transaction((tx) => {
        const insertedRows: Event[] = []
        for (const row of rows) {
          const inserted = tx.insert(events).values(row).returning().get()
          if (inserted) insertedRows.push(inserted)
        }
        return insertedRows
      })
    },

    update: (id: string, updates: UpdateEvent): Event => {
      if (!id) throw new Error("updateEvent: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateEvent: updates are required")
      }

      if ("startDateTime" in updates || "endDateTime" in updates) {
        const current = eventQueries.getById(id)
        assertValidEventDateRange(
          "startDateTime" in updates ? updates.startDateTime ?? null : current.startDateTime,
          "endDateTime" in updates ? updates.endDateTime ?? null : current.endDateTime,
        )
      }

      const updatedEvent = database.update(events)
        .set({ ...updates, updatedAt: Date.now().toString() })
        .where(eq(events.id, id))
        .returning()
        .get()

      if (!updatedEvent) throw new Error(`Event not found for id ${id}`)

      return updatedEvent
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteEvent: ID is required")

      const deleted = database.delete(events).where(eq(events.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Event not found for id ${id}`)

      return true
    },
  }

  return eventQueries
}

export default createEventsRepository(db)
