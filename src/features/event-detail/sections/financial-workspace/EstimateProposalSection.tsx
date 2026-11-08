import React, { useRef, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import type { DepositKind, EstimateDetails, UpdateEstimateDetails } from "~/definitions/database"
import { centsToDollars, parseDollarsToCents } from "~/features/event-detail/workspace/lib/financial"
import {
  formatDeposit,
  nextEventTerms,
  usesVenueDefaultTerms,
  type CentsRange,
} from "~/features/preview/lib/estimateProposal"
import { useEstimateDetailsSection } from "~/hooks/useEstimateDetailsSection"
import { useVenueSettings } from "~/hooks/useVenueSettings"
import { formatProposalDetailsRecap, isProposalDetailsEmpty } from "./proposalDetailsRecap"

const LABEL_CLASS = "mb-1 block text-xs uppercase tracking-wide text-muted-foreground"
const FIELD_CLASS =
  "w-full rounded-xs border border-stone-300 bg-transparent px-2 py-1 text-sm outline-none focus-visible:ring-[2px] focus-visible:ring-orange-500"
const LINK_BUTTON_CLASS = "text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"

const DEPOSIT_OPTIONS: Array<{ value: DepositKind; label: string }> = [
  { value: "none", label: "No deposit" },
  { value: "amount", label: "Fixed amount" },
  { value: "percent", label: "% of grand total" },
]

/** Empty text is stored as null so a cleared field prints nothing. */
function textOrNull(value: string): string | null {
  return value.trim() ? value : null
}

const DepositFields: React.FC<{
  details: EstimateDetails
  grandTotal: CentsRange
  onUpdate: (updates: UpdateEstimateDetails) => void
}> = ({ details, grandTotal, onUpdate }) => {
  const deposit = formatDeposit(details, grandTotal)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label htmlFor="estimate-deposit-kind" className={LABEL_CLASS}>Deposit</label>
          <select
            id="estimate-deposit-kind"
            value={details.depositKind}
            onChange={(e) => onUpdate({ depositKind: e.target.value as DepositKind })}
            className={FIELD_CLASS}
          >
            {DEPOSIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {details.depositKind === "amount" ? (
          <div>
            <label htmlFor="estimate-deposit-amount" className={LABEL_CLASS}>Amount ($)</label>
            <input
              key={details.depositAmountCents ?? "empty"}
              id="estimate-deposit-amount"
              type="text"
              inputMode="decimal"
              defaultValue={details.depositAmountCents == null ? "" : centsToDollars(details.depositAmountCents).toFixed(2)}
              onBlur={(e) => {
                const value = e.target.value.trim()
                const parsed = value ? parseDollarsToCents(value) : null
                // Not a number: keep the saved amount rather than store $0.
                if (value && parsed == null) {
                  e.target.value = details.depositAmountCents == null ? "" : centsToDollars(details.depositAmountCents).toFixed(2)
                  return
                }
                onUpdate({ depositAmountCents: parsed == null ? null : Math.max(0, parsed) })
              }}
              className={FIELD_CLASS}
            />
          </div>
        ) : null}

        {details.depositKind === "percent" ? (
          <div>
            <label htmlFor="estimate-deposit-percent" className={LABEL_CLASS}>Percent (%)</label>
            <input
              key={details.depositPercent ?? "empty"}
              id="estimate-deposit-percent"
              type="number"
              min="0"
              max="100"
              defaultValue={details.depositPercent ?? ""}
              onBlur={(e) => {
                const value = e.target.value.trim()
                onUpdate({ depositPercent: value ? Math.min(100, Math.max(0, Number(value) || 0)) : null })
              }}
              className={FIELD_CLASS}
            />
          </div>
        ) : null}

        {details.depositKind !== "none" ? (
          <div>
            <label htmlFor="estimate-deposit-due" className={LABEL_CLASS}>Due date</label>
            <input
              id="estimate-deposit-due"
              type="date"
              value={details.depositDueDate ?? ""}
              onChange={(e) => onUpdate({ depositDueDate: e.target.value || null })}
              className={FIELD_CLASS}
            />
          </div>
        ) : null}
      </div>

      {details.depositKind !== "none" ? (
        <>
          <div>
            <label htmlFor="estimate-deposit-note" className={LABEL_CLASS}>Deposit note</label>
            <input
              key={details.depositNote ?? ""}
              id="estimate-deposit-note"
              type="text"
              placeholder="e.g. Non-refundable. Holds the date."
              defaultValue={details.depositNote ?? ""}
              onBlur={(e) => onUpdate({ depositNote: textOrNull(e.target.value) })}
              className={FIELD_CLASS}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {deposit ? `Deposit on the current totals: ${deposit}` : "Enter an amount to print a deposit."}
          </p>
        </>
      ) : null}
    </div>
  )
}

const TermsField: React.FC<{
  details: EstimateDetails
  venueDefaultTerms: string | null
  onUpdate: (updates: UpdateEstimateDetails) => void
  onSaveVenueDefault: (terms: string | null) => void
}> = ({ details, venueDefaultTerms, onUpdate, onSaveVenueDefault }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const followsDefault = usesVenueDefaultTerms(details)
  const shownTerms = followsDefault ? venueDefaultTerms ?? "" : details.terms ?? ""

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="estimate-terms" className={`${LABEL_CLASS} mb-0`}>
          Terms <span className="normal-case tracking-normal">
            ({followsDefault ? "venue default" : "this event only"})
          </span>
        </label>
        <div className="flex gap-3">
          {!followsDefault ? (
            <button type="button" className={LINK_BUTTON_CLASS} onClick={() => onUpdate({ terms: null })}>
              Use venue default
            </button>
          ) : null}
          <button
            type="button"
            className={LINK_BUTTON_CLASS}
            onClick={() => {
              // Read the box itself so text typed but not yet saved is included.
              onSaveVenueDefault(textOrNull(textareaRef.current?.value ?? shownTerms))
              // The event follows the default again now that it matches.
              onUpdate({ terms: null })
            }}
          >
            Save as venue default
          </button>
        </div>
      </div>
      <textarea
        key={`${followsDefault}:${shownTerms}`}
        ref={textareaRef}
        id="estimate-terms"
        rows={5}
        defaultValue={shownTerms}
        placeholder="Payment terms, cancellation policy, minimums…"
        onBlur={(e) => {
          const terms = nextEventTerms(e.target.value, details.terms, venueDefaultTerms)
          if (terms !== undefined) onUpdate({ terms })
        }}
        className={FIELD_CLASS}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Editing here changes this event only. Separate paragraphs with a blank line.
      </p>
    </div>
  )
}

const ProposalDetailsCard: React.FC<{
  details: EstimateDetails
  grandTotal: CentsRange
  venueDefaultTerms: string | null
  onUpdate: (updates: UpdateEstimateDetails) => void
  onSaveVenueDefault: (terms: string | null) => void
}> = ({ details, grandTotal, venueDefaultTerms, onUpdate, onSaveVenueDefault }) => {
  // Decided once per event: an untouched card starts open so it gets filled in. It never
  // collapses by itself, so typing (or a teammate's live edit) doesn't close it mid-edit.
  const [open, setOpen] = useState(() => isProposalDetailsEmpty(details))

  return (
    <div className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="estimate-proposal-fields"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="mt-0.5 text-muted-foreground">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-wide">Proposal Details</span>
          <span className="block text-xs text-muted-foreground">
            {open ? "Printed on the estimate." : formatProposalDetailsRecap(details, venueDefaultTerms)}
          </span>
        </span>
      </button>

      {open ? (
        <div id="estimate-proposal-fields" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem]">
            <div>
              <label htmlFor="estimate-intro" className={LABEL_CLASS}>Intro note</label>
              <textarea
                key={details.introNote ?? ""}
                id="estimate-intro"
                rows={3}
                defaultValue={details.introNote ?? ""}
                placeholder="Printed at the top, e.g. Thank you for considering us for your event…"
                onBlur={(e) => {
                  const introNote = textOrNull(e.target.value)
                  if (introNote !== details.introNote) onUpdate({ introNote })
                }}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="estimate-valid-until" className={LABEL_CLASS}>Valid until</label>
              <input
                id="estimate-valid-until"
                type="date"
                value={details.validUntil ?? ""}
                onChange={(e) => onUpdate({ validUntil: e.target.value || null })}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <DepositFields details={details} grandTotal={grandTotal} onUpdate={onUpdate} />

          <TermsField
            details={details}
            venueDefaultTerms={venueDefaultTerms}
            onUpdate={onUpdate}
            onSaveVenueDefault={onSaveVenueDefault}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Proposal details printed on the estimate: intro, valid-until date, deposit and terms. */
const EstimateProposalSection: React.FC<{ grandTotal: CentsRange }> = ({ grandTotal }) => {
  const { data: details, isError, updateEstimateDetails } = useEstimateDetailsSection()
  const { data: venueSettings, setDefaultEstimateTerms } = useVenueSettings()

  if (isError) return <p className="text-xs text-destructive">Proposal details failed to load.</p>
  if (!details) return <p className="text-xs text-muted-foreground">Loading proposal details…</p>

  return (
    <ProposalDetailsCard
      key={details.id}
      details={details}
      grandTotal={grandTotal}
      venueDefaultTerms={venueSettings?.defaultEstimateTerms ?? null}
      onUpdate={(updates) => updateEstimateDetails({ id: details.id, updates })}
      onSaveVenueDefault={setDefaultEstimateTerms}
    />
  )
}

export default EstimateProposalSection
