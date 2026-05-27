import { useState } from "react"

import { Calendar, ChevronDown, Users } from "lucide-react"

import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
} from "~/definitions/events/ui"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"

import { EntityKebabMenu } from "~/components/atoms/entity-kebab-menu"
import {
  DateTimeDialog,
  EditEventDialog,
  GuestCountDialog,
} from "~/components/event-detail/EventDialogs"
import { DetailsTitleBarSkeleton } from "~/features/event-detail/components/DetailsTitleBarSkeleton"
import { formatDateMonthDay, formatTime, isSameDay } from "~/lib/formatters"

import type { EventStatus, EventType } from "~/definitions/database"
import type { EventResource } from "../types"

interface DetailsTitleBarProps {
  eventResource: EventResource
}

const DetailsTitleBar: React.FC<DetailsTitleBarProps> = ({ eventResource }) => {

    const { event, isLoading, updateEvent, deleteEvent } = eventResource

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [dateDialogOpen, setDateDialogOpen] = useState(false)
    const [guestsDialogOpen, setGuestsDialogOpen] = useState(false)

    if (isLoading) {
    return (
      <div className="w-full py-1">
        <DetailsTitleBarSkeleton />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="w-full flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Event not found</p>
      </div>
    )
  }

  const type = (event.type ?? "function") as EventType
  const sameDay =
    event.startDateTime && event.endDateTime
      ? isSameDay(event.startDateTime, event.endDateTime)
      : false

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      await deleteEvent()
    }
  }

  const onStatusChange = (status: EventStatus) => {
    void updateEvent({ status })
    setStatusDropdownOpen(false)
  }
    return (
        <div className="flex justify-between px-4 py-2 border-b-1">
            <div className="min-w-0">
                <div className="flex justify-between">
                  {/* TITLE, TYPE & STATUS START */}
                  <div className="min-w-0 flex gap-8">
                    <div>
                      <p className="text-xl font-bold truncate">{event.title}</p>
                    </div>
                        
                    {/* TYPE */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${EVENT_TYPE_COLORS[type]}`}>
                        {EVENT_TYPE_LABELS[type]}
                      </span>
                      {/* STATUS */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setStatusDropdownOpen((prev) => !prev)}
                          className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${EVENT_STATUS_COLORS[event.status]} hover:opacity-80`}
                        >
                          {EVENT_STATUS_LABELS[event.status]}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                            {ITER_EVENT_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => onStatusChange(status)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                                  event.status === status ? EVENT_STATUS_COLORS[status] : ""
                                }`}
                              >
                                {EVENT_STATUS_LABELS[status]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* <p className="text-sm font-medium truncate">{event.clientName}</p> */}
            </div>
            

            <div className="flex items-center gap-8 shrink-0">
                <button
                type="button"
                onClick={() => setDateDialogOpen(true)}
                className="hidden lg:flex items-center gap-2 text-left hover:opacity-80"
                >
                <Calendar className="h-4 w-4 text-stone-600" />
                <div>
                    {sameDay ? (
                    <p className="text-sm">
                        {event.startDateTime ? formatDateMonthDay(event.startDateTime) : "Date not set"}
                        {" · "}
                        {event.startDateTime ? formatTime(event.startDateTime) : "Start not set"}
                        {" - "}
                        {event.endDateTime ? formatTime(event.endDateTime) : "End not set"}
                    </p>
                    ) : (
                    <p className="text-sm">
                        {event.startDateTime ? formatDateMonthDay(event.startDateTime) : "Start not set"}
                        {" - "}
                        {event.endDateTime ? formatDateMonthDay(event.endDateTime) : "End not set"}
                    </p>
                    )}
                </div>
                </button>
    
                <button
                type="button"
                onClick={() => setGuestsDialogOpen(true)}
                className="hidden md:flex items-center gap-2 text-left hover:opacity-80"
                >
                <Users className="h-4 w-4 text-stone-600" />
                <div>
                    <p className="text-sm">
                    {event.guestCountFinal === 1
                        ? `Final: ${event.maxGuests ?? 0}`
                        : `${event.minGuests ?? 0} - ${event.maxGuests ?? 0} `}
                        guests
                    </p>
                </div>
                </button>
    
                <EntityKebabMenu
                  onEdit={() => setEditDialogOpen(true)}
                  onDelete={() => void handleDelete()}
                  variant="ghost"
                  className="h-8 w-8"
                />
            </div>
        
              <DateTimeDialog
                open={dateDialogOpen}
                onOpenChange={setDateDialogOpen}
                startDateTime={event.startDateTime || new Date().toISOString()}
                endDateTime={event.endDateTime || new Date().toISOString()}
                onSave={(startDateTime, endDateTime) => {
                  void updateEvent({ startDateTime, endDateTime })
                }}
              />
        
              <GuestCountDialog
                open={guestsDialogOpen}
                onOpenChange={setGuestsDialogOpen}
                minGuests={event.minGuests ?? 0}
                maxGuests={event.maxGuests ?? 0}
                guestCountFinal={event.guestCountFinal === 1}
                onSave={(minGuests, maxGuests, guestCountFinal) => {
                  void updateEvent({
                    minGuests,
                    maxGuests,
                    guestCountFinal: guestCountFinal ? 1 : 0,
                  })
                }}
              />
        
              <EditEventDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                title={event.title}
                type={type}
                onSave={(title, nextType) => {
                  void updateEvent({ title, type: nextType as EventType })
                }}
              />
        </div>
    )
}

export default DetailsTitleBar