import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import CalendarDefaultPanelHeader from "./CalendarDefaultPanelHeader"

describe("CalendarDefaultPanelHeader", () => {
  it("calls unscheduled toggle handler when Calendar-X is clicked", () => {
    const onToggleUnscheduledView = vi.fn()
    render(
      <CalendarDefaultPanelHeader
        onOpenSearch={vi.fn()}
        onOpenCreate={vi.fn()}
        onToggleUnscheduledView={onToggleUnscheduledView}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Toggle unscheduled events list" }))
    expect(onToggleUnscheduledView).toHaveBeenCalledTimes(1)
  })
})
