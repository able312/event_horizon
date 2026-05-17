import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as notesIpc from "~/lib/ipc/notes"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useNoteSection } from "./useNoteSection"

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
  }
})

vi.mock("./useTimeblockMutations", () => ({
  useTimeblockMutations: () => ({
    addTimeblock: vi.fn(),
    updateTimeblock: vi.fn(),
    removeTimeblock: vi.fn(),
  }),
}))

vi.mock("~/lib/ipc/notes", () => ({
  getNotesByEvent: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeNoteTimeblock(overrides: Partial<TimeblockWithItems> = {}): TimeblockWithItems {
  return {
    id: "tb-note-1",
    eventId: "event-1",
    title: "Note",
    time: null,
    sectionType: "note",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    note: {
      id: "note-1",
      timeblockId: "tb-note-1",
      content: "Original note",
      createdAt: "created",
      updatedAt: null,
    },
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useNoteSection optimistic cache", () => {
  it("optimistic update changes nested note.content", async () => {
    const getNotesMock = vi.mocked(notesIpc.getNotesByEvent)
    const updateNoteMock = vi.mocked(notesIpc.updateNote)

    getNotesMock.mockResolvedValue([makeNoteTimeblock()])
    const deferredUpdate = createDeferred<ReturnType<typeof notesIpc.updateNote> extends Promise<infer R> ? R : never>()
    updateNoteMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useNoteSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateNote({
        id: "note-1",
        updates: { content: "Updated note" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["note", "event-1"])
      expect(cached?.[0].note?.content).toBe("Updated note")
    })

    deferredUpdate.resolve({
      id: "note-1",
      timeblockId: "tb-note-1",
      content: "Updated note",
      createdAt: "created",
      updatedAt: null,
    })
  })

  it("optimistic add uses nested note shape and replaces temp row on success", async () => {
    const getNotesMock = vi.mocked(notesIpc.getNotesByEvent)
    const createNoteMock = vi.mocked(notesIpc.createNote)

    const serverResponse = {
      timeblock: {
        id: "tb-note-created",
        eventId: "event-1",
        title: "",
        time: "",
        sectionType: "note" as const,
        assignedTo: null,
        createdAt: "created",
        updatedAt: null,
      },
      note: {
        id: "note-created",
        timeblockId: "tb-note-created",
        content: "",
        createdAt: "created",
        updatedAt: "created",
      },
    }

    getNotesMock
      .mockResolvedValueOnce([])
      .mockResolvedValue([{
        ...serverResponse.timeblock,
        note: serverResponse.note,
      }])
    const deferredCreate = createDeferred<ReturnType<typeof notesIpc.createNote> extends Promise<infer R> ? R : never>()
    createNoteMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useNoteSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addNote()
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["note", "event-1"])
      expect(cached?.[0].eventId).toBe("event-1")
      expect(cached?.[0].sectionType).toBe("note")
      expect(cached?.[0].time).toBe("")
      expect(cached?.[0].note?.id.startsWith("temp_")).toBe(true)
    })

    await act(async () => {
      deferredCreate.resolve(serverResponse)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["note", "event-1"])
      expect(cached?.[0].id).toBe("tb-note-created")
      expect(cached?.[0].note?.id).toBe("note-created")
      expect(cached?.[0].time).toBe("")
    })
  })

  it("rolls cache back when note mutation fails", async () => {
    const getNotesMock = vi.mocked(notesIpc.getNotesByEvent)
    const updateNoteMock = vi.mocked(notesIpc.updateNote)

    const initialData = [makeNoteTimeblock()]
    getNotesMock.mockResolvedValue(initialData)
    updateNoteMock.mockRejectedValue(new Error("note update failed"))

    const { result, queryClient } = renderHookWithProviders(() => useNoteSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateNote({
        id: "note-1",
        updates: { content: "Broken update" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["note", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
