import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useEventsQueryState } from "~/hooks/useEventsQueryState"
import SearchPanel from "./SearchPanel"

/** SearchPanel wired to the real URL-backed query state, as in CalendarPanelOrchestrator */
function ConnectedSearchPanel() {
  const { state, searchInput, setSearchInput, setType, setStatus, resetSearchAndFilters } =
    useEventsQueryState()
  const [dateRange, setDateRange] = useState({ dateFrom: "2026-01-01", dateTo: "" })
  const location = useLocation()

  return (
    <>
      <output data-testid="url">{location.search}</output>
      <SearchPanel
        searchTerm={searchInput}
        onSearchChange={setSearchInput}
        filterType={state.type}
        onFilterTypeChange={setType}
        filterStatus={state.status}
        onFilterStatusChange={setStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={() => {
          resetSearchAndFilters()
          setDateRange({ dateFrom: "", dateTo: "" })
        }}
      />
    </>
  )
}

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
    onClearFilters: vi.fn(),
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

    expect(props.onClearFilters).toHaveBeenCalledTimes(1)
    // Individual setters would race on the URL; only the combined reset runs
    expect(props.onFilterTypeChange).not.toHaveBeenCalled()
    expect(props.onFilterStatusChange).not.toHaveBeenCalled()
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

  it("clears both URL-backed filters when Type and Status are set", () => {
    render(
      <MemoryRouter initialEntries={["/events?date=2026-04&search=vip&type=wedding&status=closed"]}>
        <ConnectedSearchPanel />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }))

    expect(screen.getByTestId("url").textContent).toBe("?date=2026-04")
    expect(screen.getByLabelText<HTMLSelectElement>("Type").value).toBe("all")
    expect(screen.getByLabelText<HTMLSelectElement>("Status").value).toBe("all")
    expect(screen.getByLabelText<HTMLInputElement>("Search events").value).toBe("")
    expect(screen.queryByRole("button", { name: "Clear Filters" })).toBeNull()
  })
})
