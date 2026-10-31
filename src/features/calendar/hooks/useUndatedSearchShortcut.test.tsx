import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { describe, expect, it } from "vitest"

import { useEventsQueryState } from "~/hooks/useEventsQueryState"
import { CalendarPanelStateProvider } from "../state/CalendarSidePanelProvider"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import { useUndatedSearchShortcut } from "./useUndatedSearchShortcut"

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/events?date=2026-10&type=wedding"]}>
      <CalendarPanelStateProvider bodyMode="calendar" hasActiveSearch={false} onBodyModeChange={() => {}}>
        {children}
      </CalendarPanelStateProvider>
    </MemoryRouter>
  )
}

function useSubject() {
  const queryState = useEventsQueryState()
  return {
    shortcut: useUndatedSearchShortcut(queryState),
    params: new URLSearchParams(useLocation().search),
    ui: useCalendarPanelState().ui,
  }
}

describe("useUndatedSearchShortcut", () => {
  it("opens the search panel filtered to undated events, keeping other filters", () => {
    const { result } = renderHook(useSubject, { wrapper })
    expect(result.current.shortcut.isActive).toBe(false)

    act(() => result.current.shortcut.toggle())

    expect(result.current.shortcut.isActive).toBe(true)
    expect(result.current.ui.sidebarMode).toBe("search")
    expect(result.current.params.get("undated")).toBe("1")
    expect(result.current.params.get("type")).toBe("wedding")
  })

  it("turns only the undated filter off on a second press, leaving the panel open", () => {
    const { result } = renderHook(useSubject, { wrapper })
    act(() => result.current.shortcut.toggle())

    act(() => result.current.shortcut.toggle())

    expect(result.current.shortcut.isActive).toBe(false)
    expect(result.current.params.has("undated")).toBe(false)
    expect(result.current.params.get("type")).toBe("wedding")
    expect(result.current.ui.sidebarMode).toBe("search")
  })
})
