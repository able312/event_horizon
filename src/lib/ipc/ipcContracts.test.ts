import { beforeEach, describe, expect, it, vi } from "vitest"
import * as cartDetailsIpc from "./cartDetails"
import * as eventsIpc from "./ipcEventsQueries"
import * as notesIpc from "./notes"
import * as setupInstructionsIpc from "./setupInstructions"
import * as tournamentDetailsIpc from "./tournamentDetails"
import * as vendorItemsIpc from "./vendorItems"

type WrapperCase = {
  name: string
  channel: string
  args: unknown[]
  invokeWrapper: (...args: unknown[]) => Promise<unknown>
}

const eventId = "event-1"
const recordId = "record-1"
const timeblockId = "timeblock-1"
const monthParam = "2026-04"

const createEventArg = { eventType: "Tournament Event" } as Parameters<typeof eventsIpc.createEvent>[0]
const updateEventArg = { title: "Updated Event" } as Parameters<typeof eventsIpc.updateEvent>[1]
const icsImportCommitArg = {
  sessionId: "session-1",
  selectedRowIds: ["row-1", "row-2"],
} as Parameters<typeof eventsIpc.commitIcsImport>[0]
const searchEventsArg = {
  query: "alpha",
  type: null,
  status: null,
  startFrom: null,
  startTo: null,
  page: 0,
  pageSize: 50,
} as Parameters<typeof eventsIpc.searchEvents>[0]
const updateNoteArg = { content: "Updated note" } as Parameters<typeof notesIpc.updateNote>[1]
const updateSetupInstructionArg = { instruction: "Updated instruction" } as Parameters<
  typeof setupInstructionsIpc.updateSetupInstruction
>[1]
const updateVendorArg = { notes: "Updated vendor notes" } as Parameters<typeof vendorItemsIpc.updateVendor>[1]
const updateCartDetailsArg = { notes: "Updated cart notes" } as Parameters<typeof cartDetailsIpc.updateCartDetails>[1]
const updateTournamentDetailsArg = { notes: "Updated tournament notes" } as Parameters<
  typeof tournamentDetailsIpc.updateTournamentDetails
>[1]

const wrapperCases: WrapperCase[] = [
  {
    name: "events.getAllEvents",
    channel: "events:get-many",
    args: [],
    invokeWrapper: eventsIpc.getAllEvents as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.getEventsByMonth",
    channel: "events:get-by-month",
    args: [monthParam],
    invokeWrapper: eventsIpc.getEventsByMonth as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.getUnscheduledEvents",
    channel: "events:get-unscheduled",
    args: [],
    invokeWrapper: eventsIpc.getUnscheduledEvents as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.getEventById",
    channel: "events:get-by-id",
    args: [recordId],
    invokeWrapper: eventsIpc.getEventById as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.createEvent",
    channel: "events:post",
    args: [createEventArg],
    invokeWrapper: eventsIpc.createEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.updateEvent",
    channel: "events:patch",
    args: [recordId, updateEventArg],
    invokeWrapper: eventsIpc.updateEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.deleteEvent",
    channel: "events:delete",
    args: [recordId],
    invokeWrapper: eventsIpc.deleteEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.searchEvents",
    channel: "events:search",
    args: [searchEventsArg],
    invokeWrapper: eventsIpc.searchEvents as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "events.commitIcsImport",
    channel: "events:import-ics:commit",
    args: [icsImportCommitArg],
    invokeWrapper: eventsIpc.commitIcsImport as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "notes.getNotesByEvent",
    channel: "notes:get-by-event",
    args: [eventId],
    invokeWrapper: notesIpc.getNotesByEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "notes.createNote",
    channel: "notes:post",
    args: [eventId],
    invokeWrapper: notesIpc.createNote as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "notes.updateNote",
    channel: "notes:patch",
    args: [recordId, updateNoteArg],
    invokeWrapper: notesIpc.updateNote as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "notes.deleteNote",
    channel: "notes:delete",
    args: [timeblockId],
    invokeWrapper: notesIpc.deleteNote as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "setupInstructions.getSetupInstructionsByEvent",
    channel: "setup-instructions:get-by-event",
    args: [eventId],
    invokeWrapper: setupInstructionsIpc.getSetupInstructionsByEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "setupInstructions.createSetupInstruction",
    channel: "setup-instructions:post",
    args: [eventId],
    invokeWrapper: setupInstructionsIpc.createSetupInstruction as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "setupInstructions.updateSetupInstruction",
    channel: "setup-instructions:patch",
    args: [recordId, updateSetupInstructionArg],
    invokeWrapper: setupInstructionsIpc.updateSetupInstruction as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "setupInstructions.deleteSetupInstruction",
    channel: "setup-instructions:delete",
    args: [timeblockId],
    invokeWrapper: setupInstructionsIpc.deleteSetupInstruction as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "vendorItems.getVendorsByEvent",
    channel: "vendor-items:get-by-event",
    args: [eventId],
    invokeWrapper: vendorItemsIpc.getVendorsByEvent as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "vendorItems.createVendor",
    channel: "vendor-items:post",
    args: [eventId],
    invokeWrapper: vendorItemsIpc.createVendor as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "vendorItems.updateVendor",
    channel: "vendor-items:patch",
    args: [recordId, updateVendorArg],
    invokeWrapper: vendorItemsIpc.updateVendor as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "vendorItems.deleteVendor",
    channel: "vendor-items:delete",
    args: [timeblockId],
    invokeWrapper: vendorItemsIpc.deleteVendor as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.getCartDetails",
    channel: "cart-details:get-many",
    args: [],
    invokeWrapper: cartDetailsIpc.getCartDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.getCartDetailsByEventId",
    channel: "cart-details:get-by-event-id",
    args: [eventId],
    invokeWrapper: cartDetailsIpc.getCartDetailsByEventId as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.getOrCreateCartDetailsByEventId",
    channel: "cart-details:get-or-create-by-event-id",
    args: [eventId],
    invokeWrapper: cartDetailsIpc.getOrCreateCartDetailsByEventId as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.createCartDetails",
    channel: "cart-details:post",
    args: [eventId],
    invokeWrapper: cartDetailsIpc.createCartDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.updateCartDetails",
    channel: "cart-details:patch",
    args: [recordId, updateCartDetailsArg],
    invokeWrapper: cartDetailsIpc.updateCartDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "cartDetails.deleteCartDetails",
    channel: "cart-details:delete",
    args: [recordId],
    invokeWrapper: cartDetailsIpc.deleteCartDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.getTournamentDetails",
    channel: "tournament-details:get-many",
    args: [],
    invokeWrapper: tournamentDetailsIpc.getTournamentDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.getTournamentDetailsByEventId",
    channel: "tournament-details:get-by-event-id",
    args: [eventId],
    invokeWrapper: tournamentDetailsIpc.getTournamentDetailsByEventId as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.getOrCreateTournamentDetailsByEventId",
    channel: "tournament-details:get-or-create-by-event-id",
    args: [eventId],
    invokeWrapper: tournamentDetailsIpc.getOrCreateTournamentDetailsByEventId as unknown as (
      ...args: unknown[]
    ) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.createTournamentDetails",
    channel: "tournament-details:post",
    args: [eventId],
    invokeWrapper: tournamentDetailsIpc.createTournamentDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.updateTournamentDetails",
    channel: "tournament-details:patch",
    args: [recordId, updateTournamentDetailsArg],
    invokeWrapper: tournamentDetailsIpc.updateTournamentDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
  {
    name: "tournamentDetails.deleteTournamentDetails",
    channel: "tournament-details:delete",
    args: [recordId],
    invokeWrapper: tournamentDetailsIpc.deleteTournamentDetails as unknown as (...args: unknown[]) => Promise<unknown>,
  },
]

describe("renderer IPC wrappers", () => {
  beforeEach(() => {
    vi.mocked(window.electron.ipcRenderer.invoke).mockReset()
  })

  it.each(wrapperCases)("$name returns the underlying invoke promise unchanged", ({ invokeWrapper, channel, args }) => {
    const invokeMock = vi.mocked(window.electron.ipcRenderer.invoke)
    const sentinelPromise = Promise.resolve({ status: "ok" })

    invokeMock.mockReturnValueOnce(sentinelPromise)
    const wrapperResult = invokeWrapper(...args)

    expect(wrapperResult).toBe(sentinelPromise)
    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith(channel, ...args)
  })

  it.each(wrapperCases)("$name preserves invoke rejection behavior", async ({ invokeWrapper, channel, args }) => {
    const invokeMock = vi.mocked(window.electron.ipcRenderer.invoke)
    const invokeError = new Error("ipc failed")

    invokeMock.mockRejectedValueOnce(invokeError)
    const wrapperResult = invokeWrapper(...args)

    await expect(wrapperResult).rejects.toThrow("ipc failed")
    await expect(wrapperResult).rejects.toBe(invokeError)
    expect(invokeMock).toHaveBeenCalledWith(channel, ...args)
  })

  it("events.onIcsImportReview subscribes and unsubscribes to the expected channel", () => {
    const onMock = vi.mocked(window.electron.ipcRenderer.on)
    const removeListenerMock = vi.mocked(window.electron.ipcRenderer.removeListener)
    const listener = vi.fn()

    const unsubscribe = eventsIpc.onIcsImportReview(listener)

    expect(onMock).toHaveBeenCalledTimes(1)
    expect(onMock).toHaveBeenCalledWith(
      "events:import-ics:review",
      expect.any(Function),
    )

    const wrappedListener = onMock.mock.calls[0]?.[1]
    if (typeof wrappedListener !== "function") {
      throw new Error("Expected wrapped IPC listener")
    }

    wrappedListener({ test: true })
    expect(listener).toHaveBeenCalledWith({ test: true })

    unsubscribe()
    expect(removeListenerMock).toHaveBeenCalledWith("events:import-ics:review", wrappedListener)
  })
})
