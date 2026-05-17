import React from "react"
import { DatePicker } from "~/components/ui/date-picker"

interface WeatherContingencyProps {
  rainDate: string | null
  rainDateNotes: string
  cancellationPolicy: string
  onRainDateChange: (date: string | null) => void
  onRainDateNotesChange: (notes: string) => void
  onCancellationPolicyChange: (policy: string) => void
}

const WeatherContingencySection: React.FC<WeatherContingencyProps> = ({
  rainDate,
  rainDateNotes,
  cancellationPolicy,
  onRainDateChange,
  onRainDateNotesChange,
  onCancellationPolicyChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Rain Date</label>
        <DatePicker 
          defaultValue={rainDate ? new Date(rainDate) : undefined}
          onChange={(date) => onRainDateChange(date ? date.toISOString() : null)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Rain Date Notes</label>
        <textarea
          value={rainDateNotes}
          onChange={(e) => onRainDateNotesChange(e.target.value)}
          placeholder="Indoor alternative plans, backup arrangements..."
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Cancellation Policy</label>
        <textarea
          value={cancellationPolicy}
          onChange={(e) => onCancellationPolicyChange(e.target.value)}
          placeholder="Cancellation terms, refund policy..."
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>
    </div>
  )
}

export default WeatherContingencySection
