import React from "react"
import type { EventStatus, EventType } from "~/definitions/database"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_TYPE_OPTIONS } from "~/definitions/events/ui"
import DateTimeInput from "~/components/ui/DateTimeInput"

export interface EventFormValues {
  title: string
  type: EventType
  status: EventStatus
  clientName: string
  clientEmail: string
  clientPhone: string
  startDateTime: string
  endDateTime: string
  minGuests: number
  maxGuests: number
}

interface EventFormFieldsProps {
  values: EventFormValues
  onChange: (updates: Partial<EventFormValues>) => void
  autoFocusTitle?: boolean
}

const formFieldClasses =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"

const EventFormFields: React.FC<EventFormFieldsProps> = ({
  values,
  onChange,
  autoFocusTitle = false,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-100">Event Title *</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          autoFocus={autoFocusTitle}
          className={formFieldClasses}
          placeholder="e.g., Smith Wedding"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-100">Type</label>
          <select
            value={values.type}
            onChange={(e) => onChange({ type: e.target.value as EventType })}
            className={formFieldClasses}
          >
            {EVENT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type} className="bg-stone-900 text-stone-100">
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-100">Status</label>
          <select
            value={values.status}
            onChange={(e) => onChange({ status: e.target.value as EventStatus })}
            className={formFieldClasses}
          >
            {ITER_EVENT_STATUSES.filter((status) => status !== "lost").map((status) => (
              <option key={status} value={status} className="bg-stone-900 text-stone-100">
                {EVENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-100">Client Name</label>
        <input
          type="text"
          value={values.clientName}
          onChange={(e) => onChange({ clientName: e.target.value })}
          className={formFieldClasses}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-100">Client Email</label>
        <input
          type="email"
          value={values.clientEmail}
          onChange={(e) => onChange({ clientEmail: e.target.value })}
          className={formFieldClasses}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-100">Client Phone</label>
        <input
          type="tel"
          value={values.clientPhone}
          onChange={(e) => onChange({ clientPhone: e.target.value })}
          className={formFieldClasses}
        />
      </div>

      <DateTimeInput
        label="Start Date"
        value={values.startDateTime}
        onChange={(value) => onChange({ startDateTime: value })}
        labelClassName="text-stone-100"
        dateInputClassName="border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-400 focus-visible:border-white/30"
        timeInputClassName="border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-400 focus:border-white/30"
      />

      <DateTimeInput
        label="End Date"
        value={values.endDateTime}
        onChange={(value) => onChange({ endDateTime: value })}
        labelClassName="text-stone-100"
        dateInputClassName="border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-400 focus-visible:border-white/30"
        timeInputClassName="border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-400 focus:border-white/30"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-100">Min Guests</label>
          <input
            type="number"
            value={values.minGuests || ""}
            onChange={(e) => onChange({ minGuests: parseInt(e.target.value, 10) || 0 })}
            className={formFieldClasses}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-100">Max Guests</label>
          <input
            type="number"
            value={values.maxGuests || ""}
            onChange={(e) => onChange({ maxGuests: parseInt(e.target.value, 10) || 0 })}
            className={formFieldClasses}
          />
        </div>
      </div>
    </div>
  )
}

export default EventFormFields
