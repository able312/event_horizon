import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from "react-router"
import { describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import EventDetailHeaderBar from "~/features/event-detail/pages/EventDetailHeaderBar"
import { useEventDetailRouteState } from "~/features/event-detail/workspace/hooks/useEventDetailRouteState"
import { buildWorkspaceNav } from "~/features/event-detail/workspace/lib/buildWorkspaceNav"
import { getPreviewReturnState } from "../lib/previewReturnState"
import { PreviewPreferencesProvider, usePreviewPreferences } from "../preferences/PreviewPreferencesContext"
import TimelinePreview from "./TimelinePreview"

const { data } = vi.hoisted(() => ({ data: { row: null as TimelineTimeblock | null } }))
const event: Event = {
  id: "event-1", title: "Tournament", type: "tournament", status: "confirmed",
  startDateTime: "2026-10-16T09:00:00.000Z", endDateTime: "2026-10-16T20:00:00.000Z",
  minGuests: 20, maxGuests: 30, guestCountFinal: 0, driveFolderId: null, calendarId: null,
  clientNotes: null, internalNotes: null, isInternal: 0, createdAt: "123", updatedAt: null,
}
vi.mock("~/hooks/useEvent", () => ({ useEvent: () => ({ data: event, isSuccess: true }) }))
vi.mock("~/hooks/useTimeline", () => ({ useTimeline: () => ({ data: [data.row], isSuccess: true }) }))
// Pagination readiness and scroll timing are covered by PreviewBodyOrchestrator.test.tsx.
vi.mock("../pagination/PreviewDocument", () => ({
  PreviewDocument: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PreviewBlock: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function PreviewContent() {
  const { state, dispatch } = usePreviewPreferences()
  return <div data-preview-scroll data-testid="viewport">
    <p data-testid="internal-notes">{String(state.timeline.showInternalNotes)}</p>
    <button onClick={() => dispatch({ type: "timeline/setShowInternalNotes", value: false })}>Hide internal notes</button>
    <TimelinePreview />
  </div>
}

function Preview() {
  const [params] = useSearchParams()
  return <PreviewPreferencesProvider initialState={getPreviewReturnState(params)?.preferences}>
    <PreviewContent />
  </PreviewPreferencesProvider>
}

function EventDetails() {
  useEventDetailRouteState(buildWorkspaceNav({ event, timelineRows: data.row ? [data.row] : [], sectionRows: [] }))
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  return <>
    <p data-testid="event-path">{location.pathname}</p>
    <p data-testid="preview-return">{params.get("returnTo")}</p>
    <EventDetailHeaderBar eventResource={{
      event: undefined, isLoading: true,
      updateEvent: async () => { throw new Error("Unused") },
      deleteEvent: async () => false,
    }} />
  </>
}

const cases: Array<[TimelineTimeblock["sectionType"], TimelineTimeblock["timelineMeta"]["source"], string]> = [
  ["note", "timeblock", "/events/event-1/timeblock/row-1"],
  ["setup_instruction", "timeblock", "/events/event-1/timeblock/row-1"],
  ["food", "timeblock", "/events/event-1/timeblock/row-1"],
  ["beverage", "timeblock", "/events/event-1/timeblock/row-1"],
  ["tournament_detail", "tournament_start", "/events/event-1/tournament"],
  ["cart_detail", "cart_detail", "/events/event-1/tournament"],
  ["note", "event_start", "/events/event-1/overview"],
]

describe("timeline preview navigation", () => {
  it.each(cases)("opens %s (%s) and returns with the preview context", (sectionType, source, expectedPath) => {
    data.row = {
      id: "row-1", eventId: event.id, title: "Open this row", time: "09:00", sectionType,
      details: null, assignedTo: null, createdAt: "123", updatedAt: null,
      timelineMeta: { source, isSystem: source !== "timeblock", isEditable: source === "timeblock" },
    }
    render(
      <MemoryRouter initialEntries={["/preview/event-1?type=timeline&returnTo=%2Fevents%3Fview%3Dinbox"]}>
        <Routes>
          <Route path="/preview/:id" element={<Preview />} />
          <Route path="/events/:id/:section" element={<EventDetails />} />
          <Route path="/events/:id/timeblock/:timeblockId" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Hide internal notes" }))
    screen.getByTestId("viewport").scrollTop = 1275
    fireEvent.click(screen.getByRole("button", { name: "Open this row" }))
    expect(screen.getByTestId("event-path").textContent).toBe(expectedPath)
    const returnPath = new URL(screen.getByTestId("preview-return").textContent!, "https://event-horizon.local")
    expect(returnPath.pathname).toBe("/preview/event-1")
    expect(returnPath.searchParams.get("type")).toBe("timeline")
    expect(returnPath.searchParams.get("returnTo")).toBe("/events?view=inbox")
    expect(getPreviewReturnState(returnPath.searchParams)?.scrollTop).toBe(1275)
    fireEvent.click(screen.getByRole("link", { name: "Back to Print Preview" }))
    expect(screen.getByTestId("internal-notes").textContent).toBe("false")
    expect(screen.getByRole("button", { name: "Open this row" })).toBeTruthy()
  })
})
