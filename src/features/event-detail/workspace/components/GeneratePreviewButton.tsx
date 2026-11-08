import React from "react"
import { FileText } from "lucide-react"

import { Button } from "~/components/atoms/button"

/** The "Generate …" button in the Financials header. */
export const GeneratePreviewButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <Button type="button" variant="outline" className="h-8 shrink-0 rounded-xs px-2 text-sm" onClick={onClick}>
    <FileText className="size-3.5" />
    {label}
  </Button>
)
