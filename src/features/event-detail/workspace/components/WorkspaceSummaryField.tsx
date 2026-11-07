import React from "react"

interface WorkspaceSummaryFieldProps {
  label: string
  value: string
  emphasis?: boolean
}

/** One labelled figure in a workspace summary card (estimate or invoice). */
const WorkspaceSummaryField: React.FC<WorkspaceSummaryFieldProps> = ({ label, value, emphasis = false }) => (
  <div className={emphasis
    ? " border-b-2 border-b-orange-500 bg-background px-3 py-2"
    : "bg-background px-3 py-2"}
  >
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={emphasis ? "text-base font-semibold text-foreground" : "text-sm font-medium"}>{value}</p>
  </div>
)

export default WorkspaceSummaryField
