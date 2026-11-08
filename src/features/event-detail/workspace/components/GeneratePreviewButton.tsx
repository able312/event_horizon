import React from "react"

/** The "Generate …" button in a workspace summary card's header. */
export const GeneratePreviewButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
  >
    {label}
  </button>
)
