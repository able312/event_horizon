import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import EventsTable from "./EventsTable"

afterEach(() => {
  cleanup()
})

describe("EventsTable loading empty-state behavior", () => {
  it("does not show the no-events message when loading with no rows", () => {
    render(
      <MemoryRouter>
        <EventsTable events={[]} isLoading />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("No events found. Create your first event to get started."),
    ).toBeNull()
  })

  it("shows the no-events message when not loading and no rows exist", () => {
    render(
      <MemoryRouter>
        <EventsTable events={[]} isLoading={false} />
      </MemoryRouter>,
    )

    expect(
      screen.getByText("No events found. Create your first event to get started."),
    ).toBeTruthy()
  })
})
