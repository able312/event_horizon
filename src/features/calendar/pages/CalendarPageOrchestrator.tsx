import { Body } from "~/components/layouts/SplitLayout"

import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import MonthNavigator from "~/features/calendar/navigation/MonthNavigator"
import CalendarPage from "./CalendarPage"
import type { UseEventsReturn } from "~/hooks/useEvents"
import { useCallback } from "react"
import { getCurrentMonthParam } from "~/lib/months"
import EventsTable from "~/features/calendar/views/EventsTable"
import type { Event } from "~/definitions/database"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import type { UseCalendarSearchControllerReturn } from "../hooks/useCalendarSearchController"


interface CalendarPageOrchastratorProps {
    queryState: UseEventsQueryStateReturn
    eventsHook: UseEventsReturn
    searchController: UseCalendarSearchControllerReturn
    onDeleteRequest: (eventId: string) => void
}

const CalendarPageOrchastrator: React.FC<CalendarPageOrchastratorProps> = ({
    queryState,
    eventsHook,
    searchController,
    onDeleteRequest,
}) => {

    const { state, setDate } = queryState
    const { isLoading } = eventsHook
    const { dispatch, ui } = useCalendarPanelState()
    const { result: searchResult, isFetching: isSearchFetching, enabled: isSearchEnabled } = searchController.searchQuery
    const hasSearchQuery = Boolean(state.search && state.search.length > 0)
    const bodyView = hasSearchQuery
      ? "search-results"
      : ui.bodyMode === "unscheduled"
      ? "unscheduled-list"
      : "calendar-month"

    const handleGoToToday = useCallback(() => {
        const todayMonth = getCurrentMonthParam()
        setDate(todayMonth)
      }, [setDate])

    const handleUpdateEvent = (event: Event) => {
        dispatch({ type: "OPEN_EDIT", event })
    }

    return (
        <>
            <Body.Header>
                <MonthNavigator 
                    month={ state.date }
                    onGoToToday={ handleGoToToday }
                    onMonthChange={setDate}
                />
            </Body.Header>

            {bodyView === "calendar-month" && <>
                <Body.Content>
                    <CalendarPage
                        queryState={ queryState }
                        eventsHook={ eventsHook }
                        onDeleteRequest={onDeleteRequest}
                    />
                </Body.Content>
            </>}

            {bodyView === "unscheduled-list" && <>
                <Body.Content>
                    <EventsTable
                        events={eventsHook.unscheduledEvents}
                        isLoading={isLoading}
                        onEdit={handleUpdateEvent}
                        onDelete={onDeleteRequest}
                    />
                </Body.Content>
            </>}

            {bodyView === "search-results" && <>
                <Body.Content>
                    <EventsTable 
                        events={isSearchEnabled ? searchResult.items : []}
                        isLoading={isSearchFetching || isLoading}
                        onEdit={ handleUpdateEvent }
                        onDelete={onDeleteRequest}
                    />

                    {isSearchEnabled && (
                      <div className="my-4 px-4 flex items-center justify-between fixed bottom-0 w-8/10">
                        <p className="text-sm text-muted-foreground">
                          {searchResult.total} result{searchResult.total === 1 ? "" : "s"}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                            disabled={!searchController.pagination.canPrev}
                            onClick={searchController.pagination.goPrev}
                          >
                            Previous
                          </button>
                          <span className="text-sm text-muted-foreground">
                            Page {searchController.pagination.page + 1}
                          </span>
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                            disabled={!searchController.pagination.canNext}
                            onClick={searchController.pagination.goNext}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                </Body.Content>
            </>}
            
        </>
    )
}

export default CalendarPageOrchastrator
