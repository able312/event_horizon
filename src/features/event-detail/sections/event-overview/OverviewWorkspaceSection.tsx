import React from "react"

import { Skeleton } from "~/components/atoms/skeleton"
import type { EventResource } from "~/features/event-detail/types"

import { TouchpointsCard } from "~/features/touchpoints"

import { InternalNotesCard } from "./components/InternalNotesCard"
import ContactsList from "~/features/contacts/components/ContactsList"

interface OverviewWorkspaceSectionProps {
  eventResource: EventResource
}

const OverviewWorkspaceSection: React.FC<OverviewWorkspaceSectionProps> = ({ eventResource }) => {
  const handleUpdateInternalNotes = (value: string) => {
    eventResource.updateEvent({
      internalNotes: value,
    })
  }

  if (eventResource.isLoading || !eventResource.event) {
    return <LoadingSkeleton />
  }

  const eventDetails = eventResource.event

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <InternalNotesCard
            key={eventDetails.id}
            savedValue={eventDetails.internalNotes ?? ""}
            onUpdate={handleUpdateInternalNotes}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <ContactsList
            eventId={eventDetails.id}
            eventTitle={eventDetails.title ?? "Untitled event"}
          />

          <TouchpointsCard
            eventId={eventDetails.id}
            eventStartDateTime={eventDetails.startDateTime ?? null}
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
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="min-w-0 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
