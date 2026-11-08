import React, { useState } from "react"
import { NotebookPen } from "lucide-react"

import { Button } from "~/components/atoms/button"
import type { Event } from "~/definitions/database"
import { useEstimateTotals } from "~/features/event-detail/workspace/hooks/useEstimateTotals"
import { useEstimateDetailsSection } from "~/hooks/useEstimateDetailsSection"
import { useVenueSettings } from "~/hooks/useVenueSettings"
import ProposalDetailsDialog from "./ProposalDetailsDialog"
import { formatProposalDetailsRecap, isProposalDetailsEmpty } from "./proposalDetailsRecap"

function describeButton(isError: boolean, recap: string | null): string {
  if (isError) return "Proposal details failed to load."
  return recap ?? "Loading proposal details…"
}

/** The "Proposal Details" button in the Financials header; opens the details printed on the estimate. */
const ProposalDetailsButton: React.FC<{ event: Event | undefined }> = ({ event }) => {
  const [open, setOpen] = useState(false)
  const { data: details, isError, updateEstimateDetails } = useEstimateDetailsSection()
  const { data: venueSettings, setDefaultEstimateTerms } = useVenueSettings()
  const { low, high } = useEstimateTotals(event)
  const venueDefaultTerms = venueSettings?.defaultEstimateTerms ?? null
  const needsDetails = details ? isProposalDetailsEmpty(details) : false

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-8 shrink-0 rounded-xs px-2 text-sm"
        title={describeButton(isError, details ? formatProposalDetailsRecap(details, venueDefaultTerms) : null)}
        disabled={!details}
        onClick={() => setOpen(true)}
      >
        <NotebookPen className="size-3.5" />
        Proposal Details
        {needsDetails ? (
          <span className="size-1.5 rounded-full bg-orange-500" aria-label="Not filled in yet" role="img" />
        ) : null}
      </Button>

      {details ? (
        <ProposalDetailsDialog
          open={open}
          onOpenChange={setOpen}
          details={details}
          venueDefaultTerms={venueDefaultTerms}
          grandTotal={{ lowCents: low.grandTotalCents, highCents: high.grandTotalCents }}
          onUpdate={(updates) => updateEstimateDetails({ id: details.id, updates })}
          onSaveVenueDefault={setDefaultEstimateTerms}
        />
      ) : null}
    </>
  )
}

export default ProposalDetailsButton
