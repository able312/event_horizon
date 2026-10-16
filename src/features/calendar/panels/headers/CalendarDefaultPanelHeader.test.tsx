import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

import CalendarDefaultPanelHeader from "./CalendarDefaultPanelHeader"

function renderHeader(props: Partial<React.ComponentProps<typeof CalendarDefaultPanelHeader>> = {}) {
  return render(
    <MemoryRouter>
      <CalendarDefaultPanelHeader
        onOpenSearch={vi.fn()}
        onOpenCreate={vi.fn()}
        onToggleInbox={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe("CalendarDefaultPanelHeader", () => {
  it("calls the inbox toggle handler when the Inbox button is clicked", () => {
    const onToggleInbox = vi.fn()
    renderHeader({ onToggleInbox })

    fireEvent.click(screen.getByRole("button", { name: "Toggle inbox" }))
    expect(onToggleInbox).toHaveBeenCalledTimes(1)
  })

  it("badges the Inbox with the pending request count, capped at 99+", () => {
    const { rerender } = renderHeader({ pendingRequestsCount: 3 })
    expect(screen.getByRole("button", { name: "Toggle inbox" }).textContent).toBe("3")

    rerender(
      <MemoryRouter>
        <CalendarDefaultPanelHeader onOpenSearch={vi.fn()} onOpenCreate={vi.fn()} onToggleInbox={vi.fn()} pendingRequestsCount={120} />
      </MemoryRouter>,
    )
    expect(screen.getByRole("button", { name: "Toggle inbox" }).textContent).toBe("99+")
  })

  it("links to the contacts directory", () => {
    renderHeader()

    const link = screen.getByRole("button", { name: "Open contacts" })
    expect(link).toBeTruthy()
  })
})
