import React from "react"

import { SegmentedControl } from "~/features/contacts/components/SegmentedControl"
import ProposalDetailsButton from "~/features/event-detail/sections/financial-workspace/ProposalDetailsButton"
import type { EventResource } from "~/features/event-detail/types"
import type { PreviewTypeId } from "~/features/preview/lib/previewTypes"
import { useFinancialView, type FinancialView } from "../hooks/useFinancialView"
import { useOpenPreview } from "../hooks/useOpenPreview"
import FinancialWorkspaceSection from "./FinancialWorkspaceSection"
import { GeneratePreviewButton } from "./GeneratePreviewButton"
import InvoiceWorkspaceSection from "./InvoiceWorkspaceSection"

const FINANCIAL_VIEW_OPTIONS: Array<{ value: FinancialView; label: string }> = [
  { value: "estimate", label: "Estimate" },
  { value: "invoice", label: "Invoice" },
]

const GENERATE_ACTION: Record<FinancialView, { label: string; previewType: PreviewTypeId }> = {
  estimate: { label: "Generate Estimate", previewType: "financial-report" },
  invoice: { label: "Generate Invoice", previewType: "invoice" },
}

interface FinancialsWorkspaceProps {
  eventResource: EventResource
  onSelectWorkspaceNode: (nodeId: string) => void
}

/** The Financials workspace: one place for the estimate and the invoice, switched by a toggle. */
const FinancialsWorkspace: React.FC<FinancialsWorkspaceProps> = ({ eventResource, onSelectWorkspaceNode }) => {
  const eventId = eventResource.event?.id ?? ""
  const [view, setView] = useFinancialView(eventId)
  const openPreview = useOpenPreview(eventId)
  const generate = GENERATE_ACTION[view]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Financial view"
          options={FINANCIAL_VIEW_OPTIONS}
          value={view}
          onChange={setView}
        />
        <div className="flex flex-wrap items-center gap-2">
          {view === "estimate" ? <ProposalDetailsButton event={eventResource.event} /> : null}
          <GeneratePreviewButton label={generate.label} onClick={() => openPreview(generate.previewType)} />
        </div>
      </div>
      {view === "estimate" ? (
        <FinancialWorkspaceSection eventResource={eventResource} onSelectWorkspaceNode={onSelectWorkspaceNode} />
      ) : (
        <InvoiceWorkspaceSection />
      )}
    </div>
  )
}

export default FinancialsWorkspace
