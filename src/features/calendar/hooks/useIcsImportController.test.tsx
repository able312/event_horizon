import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import type { IcsImportReviewPayload } from "~/definitions/events/icsImport"
import { commitIcsImport, onIcsImportReview } from "~/lib/ipc/ipcEventsQueries"
import { useIcsImportController } from "./useIcsImportController"

vi.mock("~/lib/ipc/ipcEventsQueries", () => ({
  commitIcsImport: vi.fn(),
  onIcsImportReview: vi.fn(),
}))

function makeReviewPayload(): IcsImportReviewPayload {
  return {
    sessionId: "session-1",
    sourceFileName: "events.ics",
    generatedAtIso: "2026-05-03T12:00:00.000Z",
    rows: [],
    summary: {
      totalRows: 0,
      validCount: 0,
      duplicateCalendarIdCount: 0,
      skippedInvalidCount: 0,
      skippedPastCount: 0,
      skippedRecurringCount: 0,
      possibleDuplicateWarningsCount: 0,
    },
  }
}

function makeEventsHook() {
  return {
    monthQuery: { refetch: vi.fn(async () => undefined) },
    unscheduledQuery: { refetch: vi.fn(async () => undefined) },
  } as unknown as Parameters<typeof useIcsImportController>[0]
}

describe("useIcsImportController", () => {
  it("subscribes on mount and unsubscribes on unmount", () => {
    const unsubscribe = vi.fn()
    vi.mocked(onIcsImportReview).mockReturnValue(unsubscribe)

    const eventsHook = makeEventsHook()
    const { unmount } = renderHook(() => useIcsImportController(eventsHook))

    expect(onIcsImportReview).toHaveBeenCalledTimes(1)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("moves to review phase when a review payload arrives", async () => {
    let listener: ((payload: IcsImportReviewPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })

    const eventsHook = makeEventsHook()
    const { result } = renderHook(() => useIcsImportController(eventsHook))
    const payload = makeReviewPayload()

    act(() => {
      listener?.(payload)
    })

    await waitFor(() => expect(result.current.phase).toBe("review"))
    expect(result.current.reviewPayload).toEqual(payload)
    expect(result.current.commitResult).toBeNull()
  })

  it("commits rows successfully and refetches event queries", async () => {
    let listener: ((payload: IcsImportReviewPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })
    vi.mocked(commitIcsImport).mockResolvedValue({
      importedCount: 2,
      skippedDuplicateCount: 0,
      skippedInvalidCount: 0,
      possibleDuplicateWarningsCount: 0,
      importedEvents: [],
      skippedInvalidRows: [],
    })

    const eventsHook = makeEventsHook()
    const { result } = renderHook(() => useIcsImportController(eventsHook))

    act(() => {
      listener?.(makeReviewPayload())
    })

    await act(async () => {
      await result.current.commitSelectedRows(["row-1"])
    })

    expect(commitIcsImport).toHaveBeenCalledWith({
      sessionId: "session-1",
      selectedRowIds: ["row-1"],
    })
    expect(eventsHook.monthQuery.refetch).toHaveBeenCalledTimes(1)
    expect(eventsHook.unscheduledQuery.refetch).toHaveBeenCalledTimes(1)
    expect(result.current.phase).toBe("report")
    expect(toast.success).toHaveBeenCalledWith("Imported 2 event(s)")
  })

  it("returns to review phase and shows error toast when commit fails", async () => {
    let listener: ((payload: IcsImportReviewPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })
    vi.mocked(commitIcsImport).mockRejectedValue(new Error("commit failed"))

    const eventsHook = makeEventsHook()
    const { result } = renderHook(() => useIcsImportController(eventsHook))

    act(() => {
      listener?.(makeReviewPayload())
    })

    await act(async () => {
      await result.current.commitSelectedRows(["row-1"])
    })

    expect(result.current.phase).toBe("review")
    expect(toast.error).toHaveBeenCalledWith("Failed to import ICS events")
  })

  it("does not close while committing, and closes during report", async () => {
    let listener: ((payload: IcsImportReviewPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })

    let resolveCommit: (() => void) | null = null
    vi.mocked(commitIcsImport).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCommit = () =>
            resolve({
              importedCount: 1,
              skippedDuplicateCount: 0,
              skippedInvalidCount: 0,
              possibleDuplicateWarningsCount: 0,
              importedEvents: [],
              skippedInvalidRows: [],
            })
        }),
    )

    const eventsHook = makeEventsHook()
    const { result } = renderHook(() => useIcsImportController(eventsHook))

    act(() => {
      listener?.(makeReviewPayload())
    })

    let commitPromise: Promise<void> | null = null
    act(() => {
      commitPromise = result.current.commitSelectedRows(["row-1"])
    })

    await waitFor(() => expect(result.current.phase).toBe("committing"))
    act(() => {
      result.current.closeDialog()
    })
    expect(result.current.phase).toBe("committing")

    act(() => {
      resolveCommit?.()
    })
    await act(async () => {
      await commitPromise
    })

    expect(result.current.phase).toBe("report")
    act(() => {
      result.current.closeDialog()
    })
    expect(result.current.phase).toBe("idle")
    expect(result.current.reviewPayload).toBeNull()
    expect(result.current.commitResult).toBeNull()
  })
})
