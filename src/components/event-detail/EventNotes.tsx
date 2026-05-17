/**
 * EventNotes Component
 * 
 * A simple textarea component for capturing internal notes about an event.
 * Displayed in the sidebar of the EventDetail page.
 * 
 * Features:
 * - Labeled textarea with placeholder text
 * - Configurable number of rows
 * - Optional value/onChange for controlled input
 * 
 * Location: src/components/event-detail/EventNotes.tsx
 */

import { useEvent } from "~/hooks/useEvent"


const EventNotes = () => {

  const { data, isLoading, updateEvent } = useEvent()

  const rows = 2
  const placeholder = isLoading ? "Loading..." : "Private note..."
  const value = data?.internalNotes ?? ""

  const onChange = (note: string) => {
    updateEvent({ internalNotes:  note})
  }


  return (
    /**
     * Notes Container
     * - Border and padding for card styling
     * - Title: "Notes"
     * - Textarea for note content
     */
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Notes</h3>
      <textarea 
        className="w-full border rounded-lg p-2 text-sm" 
        rows={rows}
        placeholder={placeholder}
        value={value}
        disabled={isLoading}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}

export default EventNotes
