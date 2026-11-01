import { Body } from "~/components/layouts/SplitLayout"

import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import MonthNavigator from "~/features/calendar/navigation/MonthNavigator"
import CalendarHolidayNotice from "~/features/calendar/navigation/CalendarHolidayNotice"
import { useMonthHolidays } from "../hooks/useMonthHolidays"
import CalendarPage from "./CalendarPage"
import type { UseEventsReturn } from "~/hooks/useEvents"
import { usePrimaryClients } from "~/hooks/useEventContacts"
import { ClientNamesError } from "../views/ClientNamesError"
import { InlineQueryError } from "~/features/contacts/components/InlineQueryError"
import { useCallback } from "react"
import { getCurrentMonthParam } from "~/lib/months"
import EventsTable from "~/features/calendar/views/EventsTable"
import type { Event } from "~/definitions/database"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import InboxBody from "~/features/inbox/InboxBody"
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
    const { searchQuery } = searchController
    const { result: searchResult, isFetching: isSearchFetching, enabled: isSearchEnabled, invalidDateRange } = searchQuery
    const hasSearchQuery = Boolean(state.search && state.search.length > 0)
    const isSearchActive = hasSearchQuery || isSearchEnabled
    // Filters left in the URL (e.g. on a Back to Inbox link) must not hide the Inbox; an open search panel still shows its results.
    const bodyView = isSearchActive && (ui.sidebarMode === "search" || ui.bodyMode !== "inbox")
      ? "search-results"
      : ui.bodyMode === "inbox"
      ? "inbox"
      : "calendar-month"
    const searchEvents = isSearchEnabled ? searchResult.items : []
    const tableEvents = bodyView === "search-results" ? searchEvents : []
    const primaryClients = usePrimaryClients(tableEvents.map((event) => event.id))
    const clientsByEventId = primaryClients.data
    const monthHolidays = useMonthHolidays(state.date)

    const handleGoToToday = useCallback(() => {
        const todayMonth = getCurrentMonthParam()
        setDate(todayMonth)
      }, [setDate])

    const handleUpdateEvent = (event: Event) => {
        dispatch({ type: "OPEN_EDIT", event })
    }

    const handleDismissRequest = (requestId: string) => {
        // The review form would otherwise try to accept a dismissed request
        if (ui.reviewingRequest?.id === requestId) dispatch({ type: "OPEN_DEFAULT" })
        dispatch({ type: "SELECT_REQUEST", requestId: null })
    }

    return (
        <>
            {bodyView === "inbox" ? (
                <InboxBody
                    selectedRequestId={ui.selectedRequestId}
                    reviewingRequestId={ui.sidebarMode === "create" ? ui.reviewingRequest?.id ?? null : null}
                    onBack={() => dispatch({ type: "OPEN_CALENDAR_VIEW" })}
                    onReviewRequest={(request) => dispatch({ type: "OPEN_REVIEW_REQUEST", request })}
                    onDismissRequest={handleDismissRequest}
                />
            ) : (
                <Body.Header>
                    <div className="flex min-w-0 items-center gap-4">
                        <MonthNavigator 
                            month={ state.date }
                            onGoToToday={ handleGoToToday }
                            onMonthChange={setDate}
                        />
                        {bodyView === "calendar-month" && (
                            <CalendarHolidayNotice
                                notice={monthHolidays.notice}
                                onRetry={monthHolidays.retry}
                                isRetrying={monthHolidays.isRetrying}
                            />
                        )}
                    </div>
                </Body.Header>
            )}

            {bodyView === "calendar-month" && <>
                <Body.Content>
                    <CalendarPage
                        queryState={ queryState }
                        eventsHook={ eventsHook }
                        onDeleteRequest={onDeleteRequest}
                    />
                </Body.Content>
            </>}

            {bodyView === "search-results" && <>
                <Body.Content>
                    {/* A rejected search would otherwise read as "0 results" */}
                    {invalidDateRange ? (
                        <p role="alert" className="mx-4 my-2 shrink-0 text-xs text-destructive">
                            The "From" date must be on or before the "To" date.
                        </p>
                    ) : searchQuery.isError ? (
                        <InlineQueryError
                            message="Could not search events."
                            onRetry={() => void searchQuery.refetch()}
                            isRetrying={searchQuery.isFetching}
                            className="mx-4 my-2 shrink-0"
                        />
                    ) : <>
                    <ClientNamesError query={primaryClients} />
                    <EventsTable 
                        events={searchEvents}
                        clientsByEventId={clientsByEventId}
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
                    </>}
                </Body.Content>
            </>}
            
        </>
    )
}

export default CalendarPageOrchastrator
