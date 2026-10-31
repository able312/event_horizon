import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import SearchPanel from "./SearchPanel"

function renderPanel(overrides: Partial<React.ComponentProps<typeof SearchPanel>> = {}) {
  const props: React.ComponentProps<typeof SearchPanel> = {
    searchTerm: "",
    onSearchChange: vi.fn(),
    filterType: null,
    onFilterTypeChange: vi.fn(),
    filterStatus: null,
    onFilterStatusChange: vi.fn(),
    dateRange: { dateFrom: "", dateTo: "" },
    onDateRangeChange: vi.fn(),
    ...overrides,
  }
  render(<SearchPanel {...props} />)
  return props
}

afterEach(cleanup)

describe("SearchPanel", () => {
  it("hides Clear Filters when nothing is filtered", () => {
    renderPanel()
    expect(screen.queryByRole("button", { name: "Clear Filters" })).toBeNull()
  })

  it("clears every filter at once", () => {
    const props = renderPanel({
      searchTerm: "smith",
      filterType: "wedding",
      filterStatus: "confirmed",
      dateRange: { dateFrom: "2026-01-01", dateTo: "2026-02-01" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }))

    expect(props.onSearchChange).toHaveBeenCalledWith("")
    expect(props.onFilterTypeChange).toHaveBeenCalledWith(null)
    expect(props.onFilterStatusChange).toHaveBeenCalledWith(null)
    expect(props.onDateRangeChange).toHaveBeenCalledWith({ dateFrom: "", dateTo: "" })
  })

  it("maps the All option back to a null filter", () => {
    const props = renderPanel({ filterType: "wedding" })

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "all" } })

    expect(props.onFilterTypeChange).toHaveBeenCalledWith(null)
  })

  it("keeps the other date bound when one date is cleared", () => {
    const props = renderPanel({ dateRange: { dateFrom: "2026-03-09", dateTo: "2026-04-01" } })

    fireEvent.click(screen.getAllByRole("button", { name: "Clear date" })[0])

    expect(props.onDateRangeChange).toHaveBeenCalledWith({ dateFrom: "", dateTo: "2026-04-01" })
  })
})
