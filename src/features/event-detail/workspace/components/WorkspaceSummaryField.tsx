import React from "react"

interface WorkspaceSummaryFieldProps {
  label: string
  value: string
  emphasis?: boolean
}

/** One labelled figure in a workspace summary (estimate or invoice). The emphasised one is the headline total. */
const WorkspaceSummaryField: React.FC<WorkspaceSummaryFieldProps> = ({ label, value, emphasis = false }) => (
  <div className="min-w-0">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={emphasis
      ? "text-lg font-semibold tabular-nums text-foreground"
      : "text-sm font-medium tabular-nums text-foreground"}
    >
      {value}
    </p>
  </div>
)

export default WorkspaceSummaryField
