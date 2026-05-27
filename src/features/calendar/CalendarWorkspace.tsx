import { SplitLayout } from "~/components/layouts/SplitLayout"
import { useCallback } from "react"

import { useEventsQueryState } from "~/hooks/useEventsQueryState"
import { useEvents } from '~/hooks/useEvents'
import { useCalendarSearchController } from "./hooks/useCalendarSearchController"
import IcsImportReviewDialog from "~/features/calendar/dialogs/IcsImportReviewDialog"
import { useIcsImportController } from "./hooks/useIcsImportController"
import { useEventDeleteConfirmation } from "./hooks/useEventDeleteConfirmation"
import EventDeleteConfirmDialog from "./components/EventDeleteConfirmDialog"

import CalendarPanelOrchastrator from "./panels/CalendarPanelOrchestrator"
import CalendarPageOrchastrator from "./pages/CalendarPageOrchestrator"
import { CalendarPanelStateProvider } from "./state/CalendarSidePanelProvider"
import RouteBlockingError from "~/components/atoms/route-blocking-error"

const CalendarWorkspace: React.FC = () => {

    const QueryState = useEventsQueryState()
    const packagedEventHook = useEvents(QueryState.state.date)
    const searchController = useCalendarSearchController(QueryState)
    const icsImportController = useIcsImportController(packagedEventHook)
    const deleteController = useEventDeleteConfirmation(packagedEventHook.deleteEvent)
    const { error, isFetching, monthQuery, unscheduledQuery } = packagedEventHook

    const handleRetryLoad = useCallback(async () => {
        await Promise.all([monthQuery.refetch(), unscheduledQuery.refetch()])
    }, [monthQuery, unscheduledQuery])

    if (error) {
        return (
            <RouteBlockingError
                title="Could not load events"
                description="Event data is temporarily unavailable. Please retry."
                onRetry={handleRetryLoad}
                isRetrying={isFetching}
            />
        )
    }

    return (
        <>
            <SplitLayout>
                <CalendarPanelStateProvider>

                    <SplitLayout.PanelWrapper>
                        <CalendarPanelOrchastrator 
                            queryState={ QueryState }
                            eventsHook={ packagedEventHook }
                            searchController={searchController}
                        />
                    </SplitLayout.PanelWrapper>
                    
                    <SplitLayout.BodyWrapper>
                        <CalendarPageOrchastrator
                            queryState={ QueryState }
                            eventsHook={ packagedEventHook }
                            searchController={searchController}
                            onDeleteRequest={deleteController.requestDelete}
                        />
                    </SplitLayout.BodyWrapper>

                </CalendarPanelStateProvider>
            </SplitLayout>

            <IcsImportReviewDialog
                open={icsImportController.phase !== "idle"}
                phase={icsImportController.phase}
                reviewPayload={icsImportController.reviewPayload}
                commitResult={icsImportController.commitResult}
                onClose={icsImportController.closeDialog}
                onCommit={icsImportController.commitSelectedRows}
            />

            <EventDeleteConfirmDialog
                open={deleteController.isOpen}
                isDeleting={deleteController.isDeleting}
                onCancel={deleteController.cancelDelete}
                onConfirm={deleteController.confirmDelete}
            />
        </>
    )
}

export default CalendarWorkspace
