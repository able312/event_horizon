import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { describe, expect, it } from "vitest"

import EventDetailHeaderBar from "../../pages/EventDetailHeaderBar"
import type { WorkspaceNavModel } from "../types"
import { useEventDetailRouteState } from "./useEventDetailRouteState"

const navModel: WorkspaceNavModel = {
  scheduled: [],
  unscheduled: [],
  categories: ["overview", "food"].map((category) => ({
    id: `category:${category}`,
    groupId: "categories",
    nodeType: "category",
    label: category,
    sourceRef: { kind: "category", categoryId: category as "overview" | "food" },
  })),
}

function EventNavigation() {
  const route = useEventDetailRouteState(navModel)
  const location = useLocation()
  return <>
    <p data-testid="path">{location.pathname}</p>
    <EventDetailHeaderBar eventResource={{
      event: undefined,
      isLoading: true,
      updateEvent: async () => { throw new Error("Unused") },
      deleteEvent: async () => false,
    }} />
    <button onClick={() => route.selectCategory("food")}>Food</button>
    <button onClick={() => route.navigateToTimeblock("note-1")}>Note</button>
  </>
}

function Origin() {
  const location = useLocation()
  return <p data-testid="origin">{location.pathname}{location.search}</p>
}

describe("event origin navigation", () => {
  it.each([
    ["/events?date=2026-10&view=inbox", "Back to Inbox"],
    ["/contacts/contact-1?search=Jane", "Back to Contact"],
  ])("keeps %s through canonicalization and event section changes", async (origin, label) => {
    render(
      <MemoryRouter initialEntries={[`/events/event-1?returnTo=${encodeURIComponent(origin)}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventNavigation />} />
          <Route path="/events/:id/:section" element={<EventNavigation />} />
          <Route path="/events/:id/timeblock/:timeblockId" element={<EventNavigation />} />
          <Route path="/events" element={<Origin />} />
          <Route path="/contacts/:contactId" element={<Origin />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/events/event-1/overview"))
    fireEvent.click(screen.getByRole("button", { name: "Food" }))
    expect(screen.getByTestId("path").textContent).toBe("/events/event-1/food")
    fireEvent.click(screen.getByRole("button", { name: "Note" }))
    expect(screen.getByTestId("path").textContent).toBe("/events/event-1/timeblock/note-1")
    fireEvent.click(screen.getByRole("link", { name: label }))
    expect(screen.getByTestId("origin").textContent).toBe(origin)
  })
})
