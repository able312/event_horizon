import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PreviewPreferencesProvider } from "~/features/preview/preferences/PreviewPreferencesContext"
import PreviewPanelOrchestrator from "./PreviewPanelOrchestrator"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  useSetupInstructionSection: vi.fn(),
  useNoteSection: vi.fn(),
  usePaymentsSection: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))
vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: hooksMock.useFoodSection,
}))
vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: hooksMock.useBeverageSection,
}))
vi.mock("~/hooks/useSetupInstrucionSection", () => ({
  useSetupInstructionSection: hooksMock.useSetupInstructionSection,
}))
vi.mock("~/hooks/useNoteSection", () => ({
  useNoteSection: hooksMock.useNoteSection,
}))
vi.mock("~/hooks/usePaymentsSection", () => ({
  usePaymentsSection: hooksMock.usePaymentsSection,
}))

function renderPanel(initialEntry: string) {
  hooksMock.useFoodSection.mockReturnValue({ data: [] })
  hooksMock.useBeverageSection.mockReturnValue({ timeblocks: [], items: [] })
  hooksMock.useSetupInstructionSection.mockReturnValue({ data: [] })
  hooksMock.useNoteSection.mockReturnValue({ data: [] })
  hooksMock.usePaymentsSection.mockReturnValue({ data: [] })

  return render(
    <PreviewPreferencesProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/preview/:id" element={<PreviewPanelOrchestrator />} />
        </Routes>
      </MemoryRouter>
    </PreviewPreferencesProvider>,
  )
}

describe("PreviewPanelOrchestrator", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders event context and preview type options", () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "evt_1",
        title: "Spring Banquet",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })

    renderPanel("/preview/evt_1?type=beo")

    expect(screen.getByText("Spring Banquet")).toBeTruthy()
    expect(screen.getByText("Preview Type")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Full BEO" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("button", { name: "Timeline" })).toBeTruthy()
  })

  it("updates the type query param when a preview type is selected", () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "evt_1",
        title: "Spring Banquet",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })

    renderPanel("/preview/evt_1?type=beo")

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }))

    expect(screen.getByRole("button", { name: "Timeline" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByText("Include system rows")).toBeTruthy()
  })

  it("shows financial options when the financial preview is active", () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "evt_1",
        title: "Spring Banquet",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })
    hooksMock.useFoodSection.mockReturnValue({ data: [] })
      hooksMock.useSetupInstructionSection.mockReturnValue({ data: [] })
    hooksMock.useNoteSection.mockReturnValue({ data: [] })
    hooksMock.useBeverageSection.mockReturnValue({
      timeblocks: [],
      items: [{ id: "b1", name: "Lager", includes: "Local", unitPriceCents: 800, quantity: null }],
    })
    hooksMock.usePaymentsSection.mockReturnValue({
      data: [{ id: "p1", amountCents: 1000 }],
    })

    render(
      <PreviewPreferencesProvider>
        <MemoryRouter initialEntries={["/preview/evt_1?type=financial-report"]}>
          <Routes>
            <Route path="/preview/:id" element={<PreviewPanelOrchestrator />} />
          </Routes>
        </MemoryRouter>
      </PreviewPreferencesProvider>,
    )

    expect(screen.getByText("Show beverage list")).toBeTruthy()
    expect(screen.getByText("Charge breakdown")).toBeTruthy()
    expect(screen.getByText("Payment status")).toBeTruthy()
  })
})
