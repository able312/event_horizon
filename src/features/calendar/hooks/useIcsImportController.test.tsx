import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import type { IcsImportParsedPayload, IcsImportReviewPayload } from "~/definitions/events/icsImport"
import { onIcsImportReview } from "~/lib/ipc/icsImport"
import { commitIcsImport, reviewIcsImport } from "../lib/icsImport"
import { useIcsImportController } from "./useIcsImportController"

vi.mock("../lib/icsImport", () => ({
  commitIcsImport: vi.fn(),
  reviewIcsImport: vi.fn(),
}))
vi.mock("~/lib/ipc/icsImport", () => ({
  onIcsImportReview: vi.fn(),
}))

function makeReviewPayload(): IcsImportReviewPayload {
  return {
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

beforeEach(() => {
  vi.mocked(reviewIcsImport).mockImplementation(async (parsed: IcsImportParsedPayload) => ({
    ...parsed,
    summary: makeReviewPayload().summary,
  }))
})

describe("useIcsImportController", () => {
  it("subscribes on mount and unsubscribes on unmount", () => {
    const unsubscribe = vi.fn()
    vi.mocked(onIcsImportReview).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useIcsImportController())

    expect(onIcsImportReview).toHaveBeenCalledTimes(1)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("moves to review phase when a review payload arrives", async () => {
    let listener: ((payload: IcsImportParsedPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })

    const { result } = renderHook(() => useIcsImportController())
    const payload = makeReviewPayload()

    act(() => {
      listener?.(payload)
    })

    await waitFor(() => expect(result.current.phase).toBe("review"))
    expect(result.current.reviewPayload).toEqual(payload)
    expect(result.current.commitResult).toBeNull()
  })

  it("commits rows successfully and reports the result", async () => {
    let listener: ((payload: IcsImportParsedPayload) => void) | null = null
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

    const { result } = renderHook(() => useIcsImportController())

    act(() => {
      listener?.(makeReviewPayload())
    })
    await waitFor(() => expect(result.current.phase).toBe("review"))

    await act(async () => {
      await result.current.commitSelectedRows(["row-1"])
    })

    expect(commitIcsImport).toHaveBeenCalledWith(makeReviewPayload(), ["row-1"])
    expect(result.current.phase).toBe("report")
    expect(toast.success).toHaveBeenCalledWith("Imported 2 event(s)")
  })

  it("returns to review phase and shows error toast when commit fails", async () => {
    let listener: ((payload: IcsImportParsedPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })
    vi.mocked(commitIcsImport).mockRejectedValue(new Error("commit failed"))

    const { result } = renderHook(() => useIcsImportController())

    act(() => {
      listener?.(makeReviewPayload())
    })
    await waitFor(() => expect(result.current.phase).toBe("review"))

    await act(async () => {
      await result.current.commitSelectedRows(["row-1"])
    })

    expect(result.current.phase).toBe("review")
    expect(toast.error).toHaveBeenCalledWith("Failed to import ICS events")
  })

  it("does not close while committing, and closes during report", async () => {
    let listener: ((payload: IcsImportParsedPayload) => void) | null = null
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

    const { result } = renderHook(() => useIcsImportController())

    act(() => {
      listener?.(makeReviewPayload())
    })
    await waitFor(() => expect(result.current.phase).toBe("review"))

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

  it("stays idle and shows an error toast when the duplicate check fails", async () => {
    let listener: ((payload: IcsImportParsedPayload) => void) | null = null
    vi.mocked(onIcsImportReview).mockImplementation((nextListener) => {
      listener = nextListener
      return () => undefined
    })
    vi.mocked(reviewIcsImport).mockRejectedValueOnce(new Error("lookup failed"))
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    const { result } = renderHook(() => useIcsImportController())

    act(() => {
      listener?.(makeReviewPayload())
    })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to check imported events for duplicates"),
    )
    expect(result.current.phase).toBe("idle")
    expect(result.current.reviewPayload).toBeNull()
  })
})
