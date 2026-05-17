import { useCallback, useMemo } from "react"

import type { Event, NewEvent, UpdateEvent } from "~/definitions/database"
import type { UseEventsReturn } from "~/hooks/useEvents"
import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import { useHotkey } from "~/lib/hotKeys"

import type { UseCalendarSearchControllerReturn } from "./useCalendarSearchController"
import { ACTIONS } from "../state/calendarSidePanelReducer"
import { useCalendarPanelState } from "../state/useCalendarPanelState"

export function useCalendarWorkspaceViewModel(
  queryState: UseEventsQueryStateReturn,
  eventsHook: UseEventsReturn,
  searchController: UseCalendarSearchControllerReturn,
) {
  const { dispatch, ui } = useCalendarPanelState()
  const { setSearch, setStatus, setType, setSearchInput } = queryState
  const { createEvent, updateEvent } = eventsHook

  const closeSearchPanel = useCallback(() => {
    setSearch("")
    setType(null)
    setStatus(null)
    searchController.reset()
    dispatch({ type: ACTIONS.CLOSE_SEARCH })
    setSearchInput("")
  }, [dispatch, searchController, setSearch, setSearchInput, setStatus, setType])

  const openSearchPanel = useCallback(() => {
    dispatch({ type: ACTIONS.OPEN_SEARCH })
  }, [dispatch])

  const openCreatePanel = useCallback(() => {
    dispatch({ type: ACTIONS.OPEN_CREATE, prefillIso: null })
  }, [dispatch])

  const openCreatePanelWithPrefill = useCallback(
    (prefillIso: string | null) => {
      dispatch({ type: ACTIONS.OPEN_CREATE, prefillIso })
    },
    [dispatch],
  )

  const openEditPanel = useCallback(
    (event: Event) => {
      dispatch({ type: ACTIONS.OPEN_EDIT, event })
    },
    [dispatch],
  )

  const openDefaultPanel = useCallback(() => {
    dispatch({ type: ACTIONS.OPEN_DEFAULT })
  }, [dispatch])

  const toggleUnscheduledView = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_UNSCHEDULED_VIEW })
  }, [dispatch])

  const onCreateEvent = useCallback(
    async (event: NewEvent) => {
      await createEvent(event)
    },
    [createEvent],
  )

  const onSaveEventUpdates = useCallback(
    async (updates: UpdateEvent) => {
      if (!ui.editingEvent) return
      await updateEvent({ id: ui.editingEvent.id, updates })
    },
    [ui.editingEvent, updateEvent],
  )

  useHotkey("Cmd+f", openSearchPanel)
  useHotkey("Cmd+N", openCreatePanel)
  useHotkey("escape", () => {
    if (ui.bodyMode === "unscheduled" && ui.sidebarMode !== "create" && ui.sidebarMode !== "edit") {
      dispatch({ type: ACTIONS.OPEN_CALENDAR_VIEW })
    }
  })

  return useMemo(
    () => ({
      ui,
      panelActions: {
        openSearchPanel,
        closeSearchPanel,
        openCreatePanel,
        openCreatePanelWithPrefill,
        openEditPanel,
        openDefaultPanel,
        toggleUnscheduledView,
      },
      mutations: {
        onCreateEvent,
        onSaveEventUpdates,
      },
    }),
    [
      closeSearchPanel,
      onCreateEvent,
      onSaveEventUpdates,
      openCreatePanel,
      openCreatePanelWithPrefill,
      openDefaultPanel,
      openEditPanel,
      openSearchPanel,
      toggleUnscheduledView,
      ui,
    ],
  )
}

export type UseCalendarWorkspaceViewModelReturn = ReturnType<typeof useCalendarWorkspaceViewModel>
