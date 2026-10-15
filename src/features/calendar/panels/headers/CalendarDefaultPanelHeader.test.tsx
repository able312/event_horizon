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
        onToggleLeadsView={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe("CalendarDefaultPanelHeader", () => {
  it("calls the leads toggle handler when the New leads button is clicked", () => {
    const onToggleLeadsView = vi.fn()
    renderHeader({ onToggleLeadsView })

    fireEvent.click(screen.getByRole("button", { name: "Toggle new leads list" }))
    expect(onToggleLeadsView).toHaveBeenCalledTimes(1)
  })

  it("links to the contacts directory", () => {
    renderHeader()

    const link = screen.getByRole("button", { name: "Open contacts" })
    expect(link).toBeTruthy()
  })
})
