import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { events, timeblocks, tournamentDetails, cartDetails } from "../schema.js"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type {
  TimeblockType,
  TimeblockWithItems,
  TimelineMeta,
  TimelineTimeblock,
} from "../../../definitions/timeblocks/timeblocks-types.js"

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

type TimelineCandidate = TimeblockWithItems & {
  timelineMeta: TimelineMeta
}

function isValidHHmm(time: string): boolean {
  return HHMM_PATTERN.test(time)
}

function hasStrictTimelineTime<T extends { time: string | null | undefined }>(
  row: T,
): row is T & { time: string } {
  return typeof row.time === "string" && isValidHHmm(row.time)
}

function toSortKeyMinutes(time: string): number {
  const match = HHMM_PATTERN.exec(time)
  if (!match) return Number.MAX_SAFE_INTEGER

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return (hours * 60) + minutes
}

function compareTimelineRows(a: TimelineTimeblock, b: TimelineTimeblock): number {
  const minuteCompare = toSortKeyMinutes(a.time) - toSortKeyMinutes(b.time)
  if (minuteCompare !== 0) return minuteCompare

  const titleCompare = a.title.localeCompare(b.title)
  if (titleCompare !== 0) return titleCompare

  return a.id.localeCompare(b.id)
}

const formatTime = (dateTimeString: string | undefined): string | null => {
  if (!dateTimeString) return null

  const date = new Date(dateTimeString)
  if (isNaN(date.getTime())) return null

  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const time = `${hours}:${minutes}`

  return isValidHHmm(time) ? time : null
}

function addTime(timeStr: string, timeToAdd: string): string | null {
  if (!isValidHHmm(timeStr) || !isValidHHmm(timeToAdd)) return null

  const [hours, minutes] = timeStr.split(":").map(Number)
  const [addHours, addMinutes] = timeToAdd.split(":").map(Number)

  const totalMinutes = (hours * 60) + minutes + (addHours * 60) + addMinutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMinutes = totalMinutes % 60

  const nextTime = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`
  return isValidHHmm(nextTime) ? nextTime : null
}

export function createTimeblocksRepository(database: AppDatabase) {
  const timeblockQueries = {
    getById: (id: string) => {
      if (!id) throw new Error("getTimeblockById: ID is required")

      const timeblock = database.select().from(timeblocks).where(eq(timeblocks.id, id)).get()
      if (!timeblock) throw new Error(`Timeblock not found for id ${id}`)

      return timeblock
    },

    insert: (data: { eventId: string; title: string; time?: string | null; sectionType: TimeblockType }) => {
      if (!data.eventId) throw new Error("insertTimeblock: eventId is required")

      const now = Date.now().toString()
      return database.insert(timeblocks).values({
        id: uuidv4(),
        eventId: data.eventId,
        title: data.title,
        time: data.time ?? null,
        sectionType: data.sectionType,
        createdAt: now,
      }).returning().get()!
    },

    update: (id: string, updates: { title?: string; time?: string | null; displayOrder?: number | null }) => {
      if (!id) throw new Error("updateTimeblock: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateTimeblock: updates are required")
      }

      const updatedTimeblock = database.update(timeblocks)
        .set(updates)
        .where(eq(timeblocks.id, id))
        .returning()
        .get()

      if (!updatedTimeblock) throw new Error(`Timeblock not found for id ${id}`)

      return updatedTimeblock
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteTimeblock: ID is required")

      const deleted = database.delete(timeblocks).where(eq(timeblocks.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Timeblock not found for id ${id}`)

      return true
    },

    getAllTimelineBlocks: async (eventId: string): Promise<TimelineTimeblock[]> => {
      if (!eventId) throw new Error("getAllTimelineBlocks: eventId is required")

      const [event, persistedTimeblocks, rawTournamentDetails, rawCartDetails] = await Promise.all([
        database.select().from(events).where(eq(events.id, eventId)).get(),
        database.query.timeblocks.findMany({
          where: eq(timeblocks.eventId, eventId),
          with: {
            foodItems: true,
            beverageItems: true,
            vendorItem: true,
            setupInstruction: true,
            note: true,
          },
        }),
        database.query.tournamentDetails.findFirst({
          where: eq(tournamentDetails.eventId, eventId),
        }),
        database.query.cartDetails.findFirst({
          where: eq(cartDetails.eventId, eventId),
        }),
      ])

      if (!event) throw new Error(`Event not found for id ${eventId}`)

      const persistedTimelineRows: TimelineTimeblock[] = persistedTimeblocks
        .filter(hasStrictTimelineTime)
        .map((timeblock) => ({
          ...timeblock,
          timelineMeta: {
            source: "timeblock",
            isSystem: false,
            isEditable: true,
          },
        }))

      const now = Date.now().toString()
      const systemCandidates: TimelineCandidate[] = []

      const eventStartTime = formatTime(event.startDateTime ?? "")
      if (eventStartTime) {
        systemCandidates.push({
          id: "fake_timeblock_id_start",
          title: "Event Start",
          assignedTo: null,
          createdAt: now,
          updatedAt: null,
          eventId: event.id,
          time: eventStartTime,
          sectionType: "note",
          timelineMeta: {
            source: "event_start",
            isSystem: true,
            isEditable: false,
          },
        })
      }

      const eventEndTime = formatTime(event.endDateTime ?? "")
      if (eventEndTime) {
        systemCandidates.push({
          id: "fake_timeblock_id_end",
          title: "Event End",
          assignedTo: null,
          createdAt: now,
          updatedAt: null,
          eventId: event.id,
          time: eventEndTime,
          sectionType: "note",
          timelineMeta: {
            source: "event_end",
            isSystem: true,
            isEditable: false,
          },
        })
      }

      if (event.type === "tournament" && rawTournamentDetails?.time && isValidHHmm(rawTournamentDetails.time)) {
        systemCandidates.push({
          id: "fake_timeblock_id_tournament_start",
          title: `${rawTournamentDetails.startFormat ?? "Tournament"} Start`,
          createdAt: now,
          updatedAt: null,
          eventId: event.id,
          time: rawTournamentDetails.time,
          sectionType: "tournament_detail",
          assignedTo: `Lead Carts: ${rawTournamentDetails.leadCarts ?? "Not Specified"}`,
          note: {
            id: `fake_note_id_tournament_details_${eventId}`,
            timeblockId: "fake_timeblock_id_tournament_start",
            createdAt: now,
            updatedAt: null,
            content: `## Details\n${rawTournamentDetails.numberOfPlayers} Players\n${rawTournamentDetails.playFormat ?? ""}\n\n${rawTournamentDetails.notes ?? ""}`,
          },
          timelineMeta: {
            source: "tournament_start",
            isSystem: true,
            isEditable: false,
          },
        })

        const estimatedGolfEnd = addTime(rawTournamentDetails.time, rawTournamentDetails.paceOfPlay ?? "00:00")
        if (estimatedGolfEnd) {
          systemCandidates.push({
            id: "fake_timeblock_id_tournament_end",
            title: "Estimated Golf End",
            assignedTo: null,
            createdAt: now,
            updatedAt: null,
            eventId: event.id,
            time: estimatedGolfEnd,
            sectionType: "tournament_detail",
            timelineMeta: {
              source: "tournament_end",
              isSystem: true,
              isEditable: false,
            },
          })
        }
      }

      if (event.type === "tournament" && rawCartDetails?.time && isValidHHmm(rawCartDetails.time)) {
        systemCandidates.push({
          id: "fake_timeblock_id_cart_setup",
          title: "Cart Details",
          createdAt: now,
          updatedAt: null,
          eventId: event.id,
          time: rawCartDetails.time,
          sectionType: "cart_detail",
          assignedTo: `${rawCartDetails.assignedTo ?? ""}`,
          cartDetails: {
            whatGoesOnCarts: rawCartDetails.whatGoesOnCarts,
            customGrid: rawCartDetails.customGrid,
          },
          timelineMeta: {
            source: "cart_detail",
            isSystem: true,
            isEditable: false,
          },
        })
      }

      const systemTimelineRows: TimelineTimeblock[] = systemCandidates.filter(hasStrictTimelineTime)

      return [...persistedTimelineRows, ...systemTimelineRows].sort(compareTimelineRows)
    },
  }

  return timeblockQueries
}

export default createTimeblocksRepository(db)
