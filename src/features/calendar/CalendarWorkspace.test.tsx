import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import CalendarWorkspace from "./CalendarWorkspace"

const useEventsQueryStateMock = vi.fn()
const useEventsMock = vi.fn()
const useCalendarSearchControllerMock = vi.fn()
const useIcsImportControllerMock = vi.fn()
const useEventDeleteConfirmationMock = vi.fn()
const icsDialogPropsMock = vi.fn()
const deleteDialogPropsMock = vi.fn()
const pageOrchestratorPropsMock = vi.fn()
const routeBlockingErrorPropsMock = vi.fn()

vi.mock("~/hooks/useEventsQueryState", () => ({
  useEventsQueryState: () => useEventsQueryStateMock(),
}))

vi.mock("~/hooks/useEvents", () => ({
  useEvents: () => useEventsMock(),
}))

vi.mock("./hooks/useCalendarSearchController", () => ({
  useCalendarSearchController: () => useCalendarSearchControllerMock(),
}))

vi.mock("./hooks/useIcsImportController", () => ({
  useIcsImportController: () => useIcsImportControllerMock(),
}))
vi.mock("./hooks/useEventDeleteConfirmation", () => ({
  useEventDeleteConfirmation: () => useEventDeleteConfirmationMock(),
}))

vi.mock("./panels/CalendarPanelOrchestrator", () => ({
  default: () => <div data-testid="calendar-panel-orchestrator" />,
}))

vi.mock("./pages/CalendarPageOrchestrator", () => ({
  default: (props: unknown) => {
    pageOrchestratorPropsMock(props)
    return <div data-testid="calendar-page-orchestrator" />
  },
}))

vi.mock("~/features/calendar/dialogs/IcsImportReviewDialog", () => ({
  default: (props: unknown) => {
    icsDialogPropsMock(props)
    return <div data-testid="ics-review-dialog" />
  },
}))
vi.mock("./components/EventDeleteConfirmDialog", () => ({
  default: (props: unknown) => {
    deleteDialogPropsMock(props)
    return <div data-testid="delete-review-dialog" />
  },
}))
vi.mock("~/components/ui/route-blocking-error", () => ({
  default: (props: {
    title: string
    description: string
    isRetrying?: boolean
    onRetry: () => void | Promise<void>
  }) => {
    routeBlockingErrorPropsMock(props)
    return (
      <div data-testid="route-blocking-error">
        <button type="button" onClick={() => void props.onRetry()}>
          retry-load
        </button>
      </div>
    )
  },
}))

describe("CalendarWorkspace", () => {
  it("shows blocking error state when events data fails and retries both queries", async () => {
    const monthRefetch = vi.fn(async () => undefined)
    const unscheduledRefetch = vi.fn(async () => undefined)

    useEventsQueryStateMock.mockReturnValue({
      state: { date: "2026-05", search: null, type: null, status: null },
    })
    useEventsMock.mockReturnValue({
      error: new Error("load failed"),
      isFetching: false,
      monthQuery: { refetch: monthRefetch },
      unscheduledQuery: { refetch: unscheduledRefetch },
      deleteEvent: vi.fn(),
    })
    useCalendarSearchControllerMock.mockReturnValue({})
    useIcsImportControllerMock.mockReturnValue({
      phase: "idle",
      reviewPayload: null,
      commitResult: null,
      closeDialog: vi.fn(),
      commitSelectedRows: vi.fn(async () => undefined),
    })
    useEventDeleteConfirmationMock.mockReturnValue({
      pendingEventId: null,
      isOpen: false,
      isDeleting: false,
      requestDelete: vi.fn(),
      cancelDelete: vi.fn(),
      confirmDelete: vi.fn(async () => undefined),
    })

    render(<CalendarWorkspace />)

    expect(screen.getByTestId("route-blocking-error")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "retry-load" }))
    expect(monthRefetch).toHaveBeenCalledTimes(1)
    expect(unscheduledRefetch).toHaveBeenCalledTimes(1)
    expect(routeBlockingErrorPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not load events",
      }),
    )
  })

  it("wires ICS import controller state and callbacks into review dialog", () => {
    const closeDialog = vi.fn()
    const commitSelectedRows = vi.fn(async () => undefined)
    const requestDelete = vi.fn()
    const cancelDelete = vi.fn()
    const confirmDelete = vi.fn(async () => undefined)
    const reviewPayload = {
      sessionId: "session-1",
      sourceFileName: "events.ics",
      generatedAtIso: "2026-05-03T00:00:00.000Z",
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

    useEventsQueryStateMock.mockReturnValue({
      state: { date: "2026-05", search: null, type: null, status: null },
    })
    useEventsMock.mockReturnValue({
      error: null,
      isFetching: false,
      deleteEvent: vi.fn(),
      monthQuery: { refetch: vi.fn() },
      unscheduledQuery: { refetch: vi.fn() },
    })
    useCalendarSearchControllerMock.mockReturnValue({})
    useIcsImportControllerMock.mockReturnValue({
      phase: "review",
      reviewPayload,
      commitResult: null,
      closeDialog,
      commitSelectedRows,
    })
    useEventDeleteConfirmationMock.mockReturnValue({
      pendingEventId: "event-1",
      isOpen: true,
      isDeleting: false,
      requestDelete,
      cancelDelete,
      confirmDelete,
    })

    render(<CalendarWorkspace />)

    expect(icsDialogPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        phase: "review",
        reviewPayload,
        commitResult: null,
        onClose: closeDialog,
        onCommit: commitSelectedRows,
      }),
    )
    expect(deleteDialogPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        isDeleting: false,
        onCancel: cancelDelete,
        onConfirm: confirmDelete,
      }),
    )
    expect(pageOrchestratorPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onDeleteRequest: requestDelete,
      }),
    )
  })
})
