import { useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router"
import { buildEventDetailEntryPath } from "~/features/event-detail/workspace/lib/eventDetailRouteState"

import type { AssignContactTarget } from "~/definitions/contacts"
import type { Event, EventRequest, NewEvent, UpdateEvent } from "~/definitions/database"
import type { UseEventsReturn } from "~/hooks/useEvents"
import { useEventRequests } from "~/hooks/useEventRequests"
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
  const navigate = useNavigate()
  const location = useLocation()
  const { dispatch, ui } = useCalendarPanelState()
  const { setSearch, setStatus, setType, setSearchInput } = queryState
  const { createEvent, updateEvent } = eventsHook
  const { acceptRequest } = useEventRequests()

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

  const toggleInboxView = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_INBOX_VIEW })
  }, [dispatch])

  const openReviewRequestPanel = useCallback(
    (request: EventRequest) => {
      dispatch({ type: ACTIONS.OPEN_REVIEW_REQUEST, request })
    },
    [dispatch],
  )

  const onCreateEvent = useCallback(
    async (event: NewEvent, client?: AssignContactTarget | null) => {
      await createEvent(event, client)
    },
    [createEvent],
  )

  // The review form requires a client, so a missing one never reaches here.
  const onAcceptRequest = useCallback(
    async (event: NewEvent, client: AssignContactTarget | null) => {
      if (!ui.reviewingRequest || !client) return
      const createdEvent = await acceptRequest(ui.reviewingRequest.id, event, client)
      const inboxParams = new URLSearchParams(location.search)
      inboxParams.set("view", "inbox")
      inboxParams.delete("search")
      const returnTo = `/events?${inboxParams.toString()}`
      dispatch({ type: ACTIONS.SELECT_REQUEST, requestId: null })
      navigate(buildEventDetailEntryPath(createdEvent.id, returnTo))
    },
    [acceptRequest, dispatch, location.search, navigate, ui.reviewingRequest],
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
  useHotkey("Cmd+L", toggleInboxView)
  useHotkey("escape", () => {
    if (ui.bodyMode === "inbox" && ui.sidebarMode !== "create" && ui.sidebarMode !== "edit") {
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
        openReviewRequestPanel,
        toggleInboxView,
      },
      mutations: {
        onCreateEvent,
        onAcceptRequest,
        onSaveEventUpdates,
      },
    }),
    [
      closeSearchPanel,
      onAcceptRequest,
      onCreateEvent,
      onSaveEventUpdates,
      openCreatePanel,
      openCreatePanelWithPrefill,
      openDefaultPanel,
      openEditPanel,
      openReviewRequestPanel,
      openSearchPanel,
      toggleInboxView,
      ui,
    ],
  )
}
