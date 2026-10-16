import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { PreviewPreferencesProvider } from "../preferences/PreviewPreferencesContext"
import PreviewBodyOrchestrator from "./PreviewBodyOrchestrator"
import { savePreviewReturnState } from "../lib/previewReturnState"
import { createInitialPreviewPreferences } from "../preferences/previewPreferencesReducer"
import { buildPreviewPath } from "../lib/previewTypes"

const status = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    beo: false, timeline: false, fetchingContacts: false,
    notify: () => listeners.forEach((listener) => listener()),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
})
vi.mock("~/hooks/useEvent", () => ({ useEvent: () => ({ data: { id: "event" } }) }))
vi.mock("~/hooks/useEventContacts", () => ({
  usePrimaryClient: () => ({ isSuccess: true, isFetching: status.fetchingContacts }),
}))
vi.mock("~/lib/hotKeys", () => ({ useHotkey: vi.fn() }))
vi.mock("~/features/preview/pages/beo/EventOverviewPreview", async () => {
  const { useReportPreviewReadiness } = await import("../pagination/PreviewReadinessContext")
  const { useSyncExternalStore } = await import("react")
  return { EventOverviewPreview: () => {
    useReportPreviewReadiness(useSyncExternalStore(status.subscribe, () => status.beo))
    return <div>BEO document</div>
  } }
})
vi.mock("~/features/preview/pages/TimelinePreview", async () => {
  const { useReportPreviewReadiness } = await import("../pagination/PreviewReadinessContext")
  const { useSyncExternalStore } = await import("react")
  function TimelineDocument() {
    useReportPreviewReadiness(useSyncExternalStore(status.subscribe, () => status.timeline))
    return <div>Timeline document</div>
  }
  return { default: TimelineDocument }
})

function PreviewHarness() {
  const navigate = useNavigate()
  return <>
    <button onClick={() => navigate("/preview/event?type=timeline")}>Switch to timeline</button>
    <PreviewBodyOrchestrator />
  </>
}

function App() {
  return <MemoryRouter initialEntries={["/preview/event?type=beo"]}>
    <PreviewPreferencesProvider>
      <Routes><Route path="/preview/:id" element={<PreviewHarness />} /></Routes>
    </PreviewPreferencesProvider>
  </MemoryRouter>
}

describe("preview export readiness", () => {
  it("waits for the active document and resets when switching layouts", async () => {
    status.beo = false
    status.timeline = false
    status.fetchingContacts = false
    const print = vi.spyOn(window, "print").mockImplementation(() => {})
    const { rerender } = render(<App />)
    await screen.findByText("BEO document")
    expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Save as PDF" }) as HTMLButtonElement).disabled).toBe(true)

    act(() => { status.beo = true; status.notify() })
    await waitFor(() => expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole("button", { name: "Print" }))
    expect(print).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole("button", { name: "Switch to timeline" }))
    await screen.findByText("Timeline document")
    expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(true)
    act(() => { status.timeline = true; status.notify() })
    await waitFor(() => expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(false))
    // A background contacts refetch is the document's concern; it must not silently disable export.
    status.fetchingContacts = true
    rerender(<App />)
    expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(false)
    print.mockRestore()
  })
})

function ReturnDestination() {
  const location = useLocation()
  return <p data-testid="destination">{location.pathname}{location.search}{location.hash}</p>
}

describe("preview return navigation", () => {
  it.each([
    "/events/event/financial?returnTo=%2Fevents%3Fview%3Dinbox",
    "/events/event/timeblock/note-1?returnTo=%2Fcontacts%2Fcontact-1",
  ])("returns to the original event section and keeps its origin: %s", (returnTo) => {
    render(
      <MemoryRouter initialEntries={[buildPreviewPath("event", "beo", returnTo)]}>
        <PreviewPreferencesProvider>
          <Routes>
            <Route path="/preview/:id" element={<PreviewBodyOrchestrator />} />
            <Route path="/events/*" element={<ReturnDestination />} />
          </Routes>
        </PreviewPreferencesProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByTestId("destination").textContent).toBe(returnTo)
  })

  it("falls back to the event when preview was opened directly", () => {
    render(
      <MemoryRouter initialEntries={["/preview/event?type=beo"]}>
        <PreviewPreferencesProvider>
          <Routes>
            <Route path="/preview/:id" element={<PreviewBodyOrchestrator />} />
            <Route path="/events/*" element={<ReturnDestination />} />
          </Routes>
        </PreviewPreferencesProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByTestId("destination").textContent).toBe("/events/event")
  })
})

describe("preview scroll restoration", () => {
  it("waits for pagination, restores scroll once, and allows further scrolling", async () => {
    status.timeline = false
    const path = savePreviewReturnState(
      { pathname: "/preview/event", search: "?type=timeline", hash: "" },
      { scrollTop: 1450, preferences: createInitialPreviewPreferences() },
    )
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <PreviewPreferencesProvider>
          <Routes><Route path="/preview/:id" element={<PreviewBodyOrchestrator />} /></Routes>
        </PreviewPreferencesProvider>
      </MemoryRouter>,
    )
    await screen.findByText("Timeline document")
    const viewport = container.querySelector<HTMLElement>("[data-preview-scroll]")!
    expect(viewport.scrollTop).toBe(0)
    act(() => { status.timeline = true; status.notify() })
    await waitFor(() => expect(viewport.scrollTop).toBe(1450))
    viewport.scrollTop = 1600
    act(() => { status.timeline = false; status.notify() })
    act(() => { status.timeline = true; status.notify() })
    expect(viewport.scrollTop).toBe(1600)
  })
})
