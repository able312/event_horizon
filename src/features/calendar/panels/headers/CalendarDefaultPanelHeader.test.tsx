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
        onToggleUnscheduledView={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe("CalendarDefaultPanelHeader", () => {
  it("calls unscheduled toggle handler when Calendar-X is clicked", () => {
    const onToggleUnscheduledView = vi.fn()
    renderHeader({ onToggleUnscheduledView })

    fireEvent.click(screen.getByRole("button", { name: "Toggle unscheduled events list" }))
    expect(onToggleUnscheduledView).toHaveBeenCalledTimes(1)
  })

  it("links to the contacts directory", () => {
    renderHeader()

    const link = screen.getByRole("button", { name: "Open contacts" })
    expect(link).toBeTruthy()
  })
})
