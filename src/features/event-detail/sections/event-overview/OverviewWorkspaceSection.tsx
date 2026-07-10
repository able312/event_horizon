import React from "react"

import { ClientDetailsCard } from "./components/ClientDetailsCard"
import { useEvent } from "~/hooks/useEvent"
import { InternalNotesCard } from "./components/InternalNotesCard"
import { DeadlinesCard } from "./components/DeadlineCard"

const OverviewWorkspaceSection: React.FC = () => {

  const { data: eventDetails, updateEvent, isError } = useEvent()

  const handleUpdateInternalNotes = (value: string) => {
    updateEvent({
      internalNotes: value,
    })
  }

  if (!eventDetails || !eventDetails.id) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return <div>Error loading event details</div>
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <InternalNotesCard 
            key={eventDetails?.id}
            savedValue={eventDetails?.internalNotes ?? ""}
            onUpdate={handleUpdateInternalNotes}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <ClientDetailsCard 
            client={{
              name: eventDetails?.clientName ?? "No client listed",
              email: eventDetails?.clientEmail ?? "-",
              phone: eventDetails?.clientPhone ?? "-",
            }}
            eventTitle={eventDetails?.title ?? "Untitled event"}
          />
          <DeadlinesCard
            eventStartDate={
              eventDetails?.startDateTime
                ? new Date(eventDetails.startDateTime)
                : new Date()
            }
          />
        </div>
      </div>
    </div>
  )
}

export default OverviewWorkspaceSection

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  )
}