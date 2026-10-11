import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { beverageItemTimeblocks, events, foodItems, timeblocks, tournamentDetails, cartDetails } from "../schema.js"
import { and, eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type { CreateTimeblockInput, TimeblockPrefillRequest } from "../../../definitions/timeblocks/timeblock-create.js"
import type {
  TimeblockType,
  TimeblockWithItems,
  TimelineTimeblock,
} from "../../../definitions/timeblocks/timeblocks-types.js"
import type { UpdateTimeblock } from "../../../definitions/database.js"
import {
  assertConvertibleTimeblockType,
  buildConversionImpact,
  type ConversionImpact,
  type ConvertTimeblockInput,
  type ConvertTimeblockResult,
  type InspectConversionInput,
} from "../../../definitions/timeblocks/timeblock-conversion.js"
import { buildTimelineRows } from "../../../lib/timeblocks/buildTimelineRows.js"
import { getSectionDefaultPrefill } from "../../../definitions/timeblocks/setupInstructionPrefill.js"
import type { BeverageItem } from "../../../definitions/database.js"

function mapTimeblockWithBeverageItems<T extends {
  beverageItemTimeblocks?: Array<{ beverageItem: BeverageItem | null }>
}>(timeblock: T): Omit<T, "beverageItemTimeblocks"> & { beverageItems?: BeverageItem[] } {
  const { beverageItemTimeblocks: beverageLinks, ...rest } = timeblock

  return {
    ...rest,
    beverageItems: beverageLinks
      ?.map((link) => link.beverageItem)
      .filter((item): item is BeverageItem => item != null) ?? [],
  }
}

function getBlankDetailsFallback(sectionType: TimeblockType): string | null {
  return sectionType === "note" || sectionType === "setup_instruction" ? "" : null
}

function resolveRequestedPrefill(prefill: TimeblockPrefillRequest | undefined, sectionType: TimeblockType) {
  if (!prefill || prefill.mode === "blank") {
    return {
      defaultValues: null,
      overrides: null,
    }
  }

  if (prefill.mode === "section_default") {
    return {
      defaultValues: getSectionDefaultPrefill(prefill.sectionType),
      overrides: prefill.sectionType === sectionType ? prefill.overrides ?? null : null,
    }
  }

  return {
    defaultValues: null,
    overrides: null,
  }
}

function resolveCreateTimeblockValues(data: CreateTimeblockInput) {
  const { defaultValues, overrides } = resolveRequestedPrefill(data.prefill, data.sectionType)

  return {
    title: data.title ?? overrides?.title ?? defaultValues?.title ?? "",
    details: data.details ?? overrides?.details ?? defaultValues?.details ?? getBlankDetailsFallback(data.sectionType),
    time: data.time ?? null,
  }
}

function pickAllowlistedUpdates(updates: UpdateTimeblock): UpdateTimeblock {
  const next: UpdateTimeblock = {}
  if (updates.title !== undefined) next.title = updates.title
  if (updates.time !== undefined) next.time = updates.time
  if (updates.details !== undefined) next.details = updates.details
  if (updates.assignedTo !== undefined) next.assignedTo = updates.assignedTo
  return next
}

const TIMEBLOCK_WITH_ITEMS_RELATIONS = {
  foodItems: true,
  beverageItemTimeblocks: {
    with: {
      beverageItem: true,
    },
  },
} as const

export function createTimeblocksRepository(database: AppDatabase) {
  const loadTimeblockWithItems = async (id: string): Promise<TimeblockWithItems> => {
    if (!id) throw new Error("getTimeblockById: ID is required")

    const row = await database.query.timeblocks.findFirst({
      where: eq(timeblocks.id, id),
      with: TIMEBLOCK_WITH_ITEMS_RELATIONS,
    })

    if (!row) throw new Error(`Timeblock not found for id ${id}`)

    return mapTimeblockWithBeverageItems(row)
  }

  const timeblockQueries = {
    getById: (id: string) => {
      if (!id) throw new Error("getTimeblockById: ID is required")

      const timeblock = database.select().from(timeblocks).where(eq(timeblocks.id, id)).get()
      if (!timeblock) throw new Error(`Timeblock not found for id ${id}`)

      return timeblock
    },

    getByIdWithItems: async (id: string): Promise<TimeblockWithItems> => {
      return loadTimeblockWithItems(id)
    },

    insert: (data: CreateTimeblockInput) => {
      if (!data.eventId) throw new Error("insertTimeblock: eventId is required")
      const resolvedValues = resolveCreateTimeblockValues(data)

      const now = Date.now().toString()
      return database.insert(timeblocks).values({
        id: uuidv4(),
        eventId: data.eventId,
        title: resolvedValues.title,
        time: resolvedValues.time,
        details: resolvedValues.details,
        sectionType: data.sectionType,
        createdAt: now,
      }).returning().get()!
    },

    update: (id: string, updates: UpdateTimeblock) => {
      if (!id) throw new Error("updateTimeblock: ID is required")
      const allowlisted = pickAllowlistedUpdates(updates)
      if (Object.keys(allowlisted).length === 0) {
        throw new Error("updateTimeblock: updates are required")
      }

      const updatedTimeblock = database.update(timeblocks)
        .set({
          ...allowlisted,
          updatedAt: Date.now().toString(),
        })
        .where(eq(timeblocks.id, id))
        .returning()
        .get()

      if (!updatedTimeblock) throw new Error(`Timeblock not found for id ${id}`)

      return updatedTimeblock
    },

    inspectConversion: async (input: InspectConversionInput): Promise<ConversionImpact> => {
      if (!input.timeblockId) throw new Error("inspectConversion: timeblockId is required")
      const current = await loadTimeblockWithItems(input.timeblockId)
      assertConvertibleTimeblockType(current.sectionType)
      assertConvertibleTimeblockType(input.toType)

      const beverageAssignmentCount = database.select()
        .from(beverageItemTimeblocks)
        .where(eq(beverageItemTimeblocks.timeblockId, current.id))
        .all()
        .length

      return buildConversionImpact({
        timeblockId: current.id,
        title: current.title,
        fromType: current.sectionType,
        toType: input.toType,
        foodItemCount: current.foodItems?.length ?? 0,
        beverageAssignmentCount,
      })
    },

    convertSectionType: (input: ConvertTimeblockInput): ConvertTimeblockResult => {
      if (!input.timeblockId) throw new Error("convertSectionType: timeblockId is required")
      assertConvertibleTimeblockType(input.toType)

      return database.transaction((tx) => {
        const current = tx.select().from(timeblocks).where(eq(timeblocks.id, input.timeblockId)).get()
        if (!current) throw new Error(`Timeblock not found for id ${input.timeblockId}`)

        assertConvertibleTimeblockType(current.sectionType)

        const foodItemCount = tx.select().from(foodItems)
          .where(eq(foodItems.timeblockId, current.id))
          .all()
          .length

        const beverageAssignmentCount = tx.select()
          .from(beverageItemTimeblocks)
          .where(eq(beverageItemTimeblocks.timeblockId, current.id))
          .all()
          .length

        const impact = buildConversionImpact({
          timeblockId: current.id,
          title: current.title,
          fromType: current.sectionType,
          toType: input.toType,
          foodItemCount,
          beverageAssignmentCount,
        })

        if (impact.requiresConfirmation && !input.confirmDestructive) {
          throw new Error(
            "convertSectionType: destructive conversion requires confirmDestructive=true",
          )
        }

        if (current.sectionType === "food" && input.toType !== "food") {
          tx.delete(foodItems).where(eq(foodItems.timeblockId, current.id)).run()
        }

        if (current.sectionType === "beverage" && input.toType !== "beverage") {
          tx.delete(beverageItemTimeblocks)
            .where(eq(beverageItemTimeblocks.timeblockId, current.id))
            .run()
        }

        const detailsForTarget =
          current.details ?? getBlankDetailsFallback(input.toType)

        const updated = tx.update(timeblocks)
          .set({
            sectionType: input.toType,
            details: detailsForTarget,
            updatedAt: Date.now().toString(),
          })
          .where(eq(timeblocks.id, current.id))
          .returning()
          .get()

        if (!updated) throw new Error(`Timeblock not found for id ${current.id}`)

        return { timeblock: updated, impact }
      })
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteTimeblock: ID is required")

      const deleted = database.delete(timeblocks).where(eq(timeblocks.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Timeblock not found for id ${id}`)

      return true
    },

    getByEventIdAndSectionType: async (eventId: string, sectionType: TimeblockType): Promise<TimeblockWithItems[]> => {
      if (!eventId) throw new Error("getByEventIdAndSectionType: eventId is required")

      return database.query.timeblocks.findMany({
        where: and(
          eq(timeblocks.eventId, eventId),
          eq(timeblocks.sectionType, sectionType),
        ),
        with: TIMEBLOCK_WITH_ITEMS_RELATIONS,
      }).then((rows) => rows.map(mapTimeblockWithBeverageItems))
    },

    getAllTimelineBlocks: async (eventId: string): Promise<TimelineTimeblock[]> => {
      if (!eventId) throw new Error("getAllTimelineBlocks: eventId is required")

      const [event, persistedTimeblocks, rawTournamentDetails, rawCartDetails] = await Promise.all([
        database.select().from(events).where(eq(events.id, eventId)).get(),
        database.query.timeblocks.findMany({
          where: eq(timeblocks.eventId, eventId),
          with: TIMEBLOCK_WITH_ITEMS_RELATIONS,
        }),
        database.query.tournamentDetails.findFirst({
          where: eq(tournamentDetails.eventId, eventId),
        }),
        database.query.cartDetails.findFirst({
          where: eq(cartDetails.eventId, eventId),
        }),
      ])

      if (!event) throw new Error(`Event not found for id ${eventId}`)

      return buildTimelineRows({
        event,
        persistedTimeblocks: persistedTimeblocks.map(mapTimeblockWithBeverageItems),
        rawTournamentDetails,
        rawCartDetails,
      })
    },
  }

  return timeblockQueries
}

export default createTimeblocksRepository(db)
