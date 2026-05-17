import { Panel } from "~/components/layouts/SplitLayout"
import CalendarDefaultPanel from "./content/CalendarDefaultPanel"
import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import CalendarDefaultPanelHeader from "./headers/CalendarDefaultPanelHeader"
import { ACTIONS } from "../state/calendarSidePanelReducer"
import ClosePanelHeader from "./headers/ClosePanelHeader"
import SearchPanel from "./content/SearchPanel"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import CreateEventSidebarForm from "~/features/calendar/forms/CreateEventSidebarForm"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import { useCallback } from "react"
import type { UseEventsReturn } from "~/hooks/useEvents"
import EditEventSidebarForm from "~/features/calendar/forms/EditEventSidebarForm"
import type { UseCalendarSearchControllerReturn } from "../hooks/useCalendarSearchController"
import { useCalendarWorkspaceViewModel } from "../hooks/useCalendarWorkspaceViewModel"

interface CalendarPanelOrchastratorProps {
    queryState: UseEventsQueryStateReturn
    eventsHook: UseEventsReturn
    searchController: UseCalendarSearchControllerReturn
}

const CalendarPanelOrchastrator: React.FC<CalendarPanelOrchastratorProps> = ({
    queryState,
    eventsHook,
    searchController,
}) => {

    const { state, setDate, searchInput, setSearchInput, setType, setStatus } = queryState
    const { ui, dispatch } = useCalendarPanelState()
    const workspaceVm = useCalendarWorkspaceViewModel(queryState, eventsHook, searchController)

    const handleDraftPreviewChange = useCallback((draft: CalendarDraftPreview | null) => {
        dispatch({type: ACTIONS.SET_CREATE_DRAFT_PREVIEW, preview: draft})
    }, [dispatch])

    return (
        <>
            {/* DEFAULT PANEL */}
            {ui.sidebarMode === "default" && 
            <>
                <Panel.Header>
                    <CalendarDefaultPanelHeader 
                        onOpenSearch={ workspaceVm.panelActions.openSearchPanel }
                        onOpenCreate={ workspaceVm.panelActions.openCreatePanel }
                        onToggleUnscheduledView={workspaceVm.panelActions.toggleUnscheduledView}
                        isUnscheduledActive={ui.bodyMode === "unscheduled"}
                    />
                </Panel.Header>

                <Panel.Content>
                    <CalendarDefaultPanel 
                        UrlDate={ state.date }
                        setDate={ setDate }
                    />
                </Panel.Content> 
            </>}
            
            {/* SEARCH PANEL */}
            {ui.sidebarMode === "search" && 
            <>
                <Panel.Header>
                    <ClosePanelHeader
                        onPanelClose={ workspaceVm.panelActions.closeSearchPanel }
                    />
                </Panel.Header>

                <Panel.Content>
                    <SearchPanel
                        searchTerm={ searchInput }
                        onSearchChange={ setSearchInput }
                        filterType={state.type}
                        onFilterTypeChange={setType}
                        filterStatus={state.status}
                        onFilterStatusChange={setStatus}
                        dateRange={{
                            dateFrom: searchController.filters.dateFrom,
                            dateTo: searchController.filters.dateTo,
                        }}
                        onDateRangeChange={(next) => {
                            searchController.filters.setDateFrom(next.dateFrom)
                            searchController.filters.setDateTo(next.dateTo)
                        }}
                    />
                </Panel.Content> 
            </>}

            {/* CREATE PANEL */}
            {ui.sidebarMode === "create" && 
            <>
                <Panel.Header>
                    <ClosePanelHeader
                        onPanelClose={ workspaceVm.panelActions.openDefaultPanel }
                    />
                </Panel.Header>

                <Panel.Content>
                    <CreateEventSidebarForm
                        key={`create-${ui.createFormVersion}`}
                        initialStartDateTime={ui.createPrefillIso ?? undefined}
                        initialEndDateTime={ui.createPrefillIso ?? undefined}
                        onCreate={workspaceVm.mutations.onCreateEvent}
                        onCancel={ workspaceVm.panelActions.openDefaultPanel }
                        onDraftPreviewChange={ handleDraftPreviewChange }
                    />
                </Panel.Content> 
            </>}

            {/* CREATE PANEL */}
            {ui.sidebarMode === "edit" && 
            <>
                <Panel.Header>
                    <ClosePanelHeader
                        onPanelClose={ workspaceVm.panelActions.openDefaultPanel }
                    />
                </Panel.Header>

                <Panel.Content>
                    <EditEventSidebarForm
                        event={ ui.editingEvent }
                        onSave={ workspaceVm.mutations.onSaveEventUpdates }
                        onCancel={ workspaceVm.panelActions.openDefaultPanel }
                    />
                </Panel.Content> 
            </>}
            
        </>
    )
}

export default CalendarPanelOrchastrator
