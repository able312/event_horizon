import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"

import type { ContactEventHistory } from "~/definitions/contacts"
import { ContactEventHistoryList } from "./ContactEventHistoryList"

const history: ContactEventHistory[] = [{
  eventContactId: "ec-1", eventId: "event-1", eventTitle: "Jane's Wedding", eventStatus: "new_lead",
  eventStartDateTime: null, role: "client", vendorCategory: null, roleLabel: null, isPrimary: true, removedAt: null,
}]
vi.mock("~/hooks/useEventContacts", () => ({
  useContactEventHistory: () => ({ data: history, isLoading: false, isError: false }),
}))

function EventDestination() {
  const location = useLocation()
  return <p data-testid="return-destination">{new URLSearchParams(location.search).get("returnTo")}</p>
}

describe("contact event navigation", () => {
  it("carries the originating contact into the event's return destination", () => {
    render(
      <MemoryRouter initialEntries={["/contacts/contact-1"]}>
        <Routes>
          <Route path="/contacts/:contactId" element={<ContactEventHistoryList contactId="contact-1" />} />
          <Route path="/events/:id" element={<EventDestination />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("link", { name: "Jane's Wedding" }))
    expect(screen.getByTestId("return-destination").textContent).toBe("/contacts/contact-1")
  })
})
