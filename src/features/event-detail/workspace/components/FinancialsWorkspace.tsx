import React from "react"

import { SegmentedControl } from "~/features/contacts/components/SegmentedControl"
import type { EventResource } from "~/features/event-detail/types"
import { useFinancialView, type FinancialView } from "../hooks/useFinancialView"
import FinancialWorkspaceSection from "./FinancialWorkspaceSection"
import InvoiceWorkspaceSection from "./InvoiceWorkspaceSection"

const FINANCIAL_VIEW_OPTIONS: Array<{ value: FinancialView; label: string }> = [
  { value: "estimate", label: "Estimate" },
  { value: "invoice", label: "Invoice" },
]

interface FinancialsWorkspaceProps {
  eventResource: EventResource
  onSelectWorkspaceNode: (nodeId: string) => void
}

/** The Financials workspace: one place for the estimate and the invoice, switched by a toggle. */
const FinancialsWorkspace: React.FC<FinancialsWorkspaceProps> = ({ eventResource, onSelectWorkspaceNode }) => {
  const eventId = eventResource.event?.id ?? ""
  const [view, setView] = useFinancialView(eventId)

  return (
    <div className="space-y-4">
      <SegmentedControl
        aria-label="Financial view"
        options={FINANCIAL_VIEW_OPTIONS}
        value={view}
        onChange={setView}
      />
      {view === "estimate" ? (
        <FinancialWorkspaceSection eventResource={eventResource} onSelectWorkspaceNode={onSelectWorkspaceNode} />
      ) : (
        <InvoiceWorkspaceSection eventId={eventId} />
      )}
    </div>
  )
}

export default FinancialsWorkspace
