import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router"
import { describe, expect, it, vi } from "vitest"
import PreviewBodyOrchestrator from "./PreviewBodyOrchestrator"

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
    <Routes><Route path="/preview/:id" element={<PreviewHarness />} /></Routes>
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
    status.fetchingContacts = true
    rerender(<App />)
    expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(true)
    print.mockRestore()
  })
})
