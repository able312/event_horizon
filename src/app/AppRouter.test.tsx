import { fireEvent, render, screen } from "@testing-library/react"
import { Link, Route, Routes, useLocation, useNavigate } from "react-router"
import { describe, expect, it } from "vitest"

import { AppRouter } from "./AppRouter"

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="router-location">
      {`${location.pathname}${location.search}`}
    </div>
  )
}

function NavigateToEventsButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate("/events")}>
      Go to events
    </button>
  )
}

function RouterFixture() {
  return (
    <AppRouter>
      <LocationProbe />
      <NavigateToEventsButton />
      <Link to="/events/event-1/food">Open event</Link>
      <Routes>
        <Route path="/" element={<div>home-route</div>} />
        <Route path="/events" element={<div>events-route</div>} />
        <Route path="/events/:id/:section?" element={<div>event-detail-route</div>} />
      </Routes>
    </AppRouter>
  )
}

describe("AppRouter", () => {
  it("keeps window.location.pathname unchanged when in-app navigation updates the hash", () => {
    const pathnameBefore = window.location.pathname

    render(<RouterFixture />)

    expect(screen.getByText("home-route")).toBeTruthy()
    expect(window.location.pathname).toBe(pathnameBefore)

    fireEvent.click(screen.getByRole("button", { name: "Go to events" }))

    expect(screen.getByText("events-route")).toBeTruthy()
    expect(screen.getByTestId("router-location").textContent).toBe("/events")
    expect(window.location.pathname).toBe(pathnameBefore)
    expect(window.location.hash).toContain("/events")

    fireEvent.click(screen.getByRole("link", { name: "Open event" }))

    expect(screen.getByText("event-detail-route")).toBeTruthy()
    expect(screen.getByTestId("router-location").textContent).toBe("/events/event-1/food")
    expect(window.location.pathname).toBe(pathnameBefore)
    expect(window.location.hash).toContain("/events/event-1/food")
  })
})
