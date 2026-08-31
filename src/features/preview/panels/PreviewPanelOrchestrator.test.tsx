import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import PreviewPanelOrchestrator from "./PreviewPanelOrchestrator"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))

function renderPanel(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/preview/:id" element={<PreviewPanelOrchestrator />} />
      </Routes>
    </MemoryRouter>,
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
  })
})
