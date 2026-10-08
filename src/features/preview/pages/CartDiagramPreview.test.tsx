import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PreviewReadinessContext } from "~/features/preview/pagination/PreviewReadinessContext"
import { CartDiagramPreview } from "./CartDiagramPreview"

const mocks = vi.hoisted(() => ({ event: vi.fn(), cart: vi.fn() }))
vi.mock("~/hooks/useEvent", () => ({ useEvent: mocks.event }))
vi.mock("~/hooks/useCartDetailsSection", () => ({ useCartDetailsSection: mocks.cart }))

const loadedEvent = { data: { id: "event", type: "tournament" }, isSuccess: true, isError: false, isFetching: false }

function renderPreview(report: (ready: boolean) => void) {
  return render(
    <PreviewReadinessContext.Provider value={report}><CartDiagramPreview /></PreviewReadinessContext.Provider>,
  )
}

describe("CartDiagramPreview", () => {
  it("shows recovery instead of a permanent loading state when cart details fail", () => {
    const report = vi.fn()
    mocks.event.mockReturnValue(loadedEvent)
    mocks.cart.mockReturnValue({ data: undefined, isLoading: false, isSuccess: false, isError: true, isFetching: false })
    renderPreview(report)
    expect(screen.getByRole("alert").textContent).toContain("Reload preview")
    expect(screen.queryByText(/Loading cart setup diagram/)).toBeNull()
    expect(report).toHaveBeenLastCalledWith(false)
  })

  it("reports readiness once the event and cart details have loaded", () => {
    const report = vi.fn()
    mocks.event.mockReturnValue(loadedEvent)
    mocks.cart.mockReturnValue({ data: { customGrid: null }, isLoading: false, isSuccess: true, isError: false, isFetching: false })
    renderPreview(report)
    expect(screen.getByLabelText("Cart setup diagram")).toBeTruthy()
    expect(report).toHaveBeenLastCalledWith(true)
  })
})
