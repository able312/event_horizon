import React from "react"

interface EventViewToggleProps {
  viewMode: "details" | "timeline"
  onViewModeChange: (mode: "details" | "timeline") => void
}

const EventViewToggle: React.FC<EventViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex border rounded-lg overflow-hidden w-fit">
      <button
        onClick={() => onViewModeChange("details")}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          viewMode === "details" 
            ? "bg-primary text-white" 
            : "bg-white text-muted-foreground hover:bg-stone-50"
        }`}
      >
        Details
      </button>
      <button
        onClick={() => onViewModeChange("timeline")}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          viewMode === "timeline" 
            ? "bg-primary text-white" 
            : "bg-white text-muted-foreground hover:bg-stone-50"
        }`}
      >
        Timeline
      </button>
    </div>
  )
}

export default EventViewToggle
