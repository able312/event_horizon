import { waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useNoteSection } from "./useNoteSection"

const addTimeblock = vi.fn()
const updateTimeblock = vi.fn()
const removeTimeblock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
  }
})

vi.mock("./useTimeblockMutations", () => ({
  useTimeblockMutations: () => ({
    addTimeblock,
    addTimeblockAsync: addTimeblock,
    updateTimeblock,
    removeTimeblock,
    isCreating: false,
  }),
}))

vi.mock("~/lib/ipc/timeblocks", () => ({
  getTimeblocksByEventAndSection: vi.fn(),
}))

function makeNoteTimeblock(
  overrides: Partial<TimeblockWithItems> = {},
): TimeblockWithItems {
  return {
    id: "tb-note-1",
    eventId: "event-1",
    title: "Note",
    time: null,
    details: "Original note",
    sectionType: "note",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useNoteSection", () => {
  it("loads note timeblocks from the shared timeblocks IPC query", async () => {
    const getTimeblocksMock = vi.mocked(timeblocksIpc.getTimeblocksByEventAndSection)
    getTimeblocksMock.mockResolvedValue([makeNoteTimeblock()])

    const { result, queryClient } = renderHookWithProviders(() => useNoteSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getTimeblocksMock).toHaveBeenCalledWith("event-1", "note")
    expect(queryClient.getQueryData(["note", "event-1"])).toEqual([makeNoteTimeblock()])
  })

  it("returns shared timeblock mutation handlers", async () => {
    vi.mocked(timeblocksIpc.getTimeblocksByEventAndSection).mockResolvedValue([])

    const { result } = renderHookWithProviders(() => useNoteSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.addNote).toBe(addTimeblock)
    expect(result.current.addNoteAsync).toBe(addTimeblock)
    expect(result.current.updateTimeblock).toBe(updateTimeblock)
    expect(result.current.removeTimeblock).toBe(removeTimeblock)
    expect(result.current.isCreating).toBe(false)
  })
})
