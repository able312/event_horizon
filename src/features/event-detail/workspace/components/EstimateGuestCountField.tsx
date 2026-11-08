import React, { useState } from "react"
import { Users } from "lucide-react"

import { GuestCountDialog } from "~/components/event-detail/EventDialogs"
import type { Event, UpdateEvent } from "~/definitions/database"
import { resolveGuestCountRange } from "~/features/preview/lib/foodPackages"

interface EstimateGuestCountFieldProps {
  event: Event | undefined
  updateEvent: (updates: UpdateEvent) => Promise<Event>
}

function formatQuotingFor(event: Event | undefined): string {
  const guests = resolveGuestCountRange(event)
  if (!guests) return "No guest count set"
  if (event?.guestCountFinal === 1) return `Quoting for ${guests.max} guests (final)`
  if (guests.min === guests.max) return `Quoting for ${guests.max} guests`
  return `Quoting for ${guests.min}–${guests.max} guests`
}

/** The guest count per-person prices are quoted against, editable in place. */
const EstimateGuestCountField: React.FC<EstimateGuestCountFieldProps> = ({ event, updateEvent }) => {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={!event}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60"
        aria-label="Edit guest count"
      >
        <Users className="size-3.5" />
        {formatQuotingFor(event)}
      </button>

      {event ? (
        <GuestCountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          minGuests={event.minGuests ?? 0}
          maxGuests={event.maxGuests ?? 0}
          guestCountFinal={event.guestCountFinal === 1}
          onSave={(minGuests, maxGuests, guestCountFinal) => {
            void updateEvent({ minGuests, maxGuests, guestCountFinal: guestCountFinal ? 1 : 0 })
          }}
        />
      ) : null}
    </>
  )
}

export default EstimateGuestCountField
