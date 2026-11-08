import React, { useState } from "react"

import { Button } from "~/components/atoms/button"
import { DatePicker } from "~/components/atoms/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
import { Input } from "~/components/atoms/input"
import { SegmentedControl } from "~/features/contacts/components/SegmentedControl"
import type { DepositKind, EstimateDetails, UpdateEstimateDetails } from "~/definitions/database"
import { formatDeposit, type CentsRange } from "~/features/preview/lib/estimateProposal"
import { parseLocalDateKey, toLocalDateKey } from "~/lib/months"
import {
  createProposalDetailsDraft,
  draftDepositSettings,
  draftFollowsVenueDefault,
  resolveProposalDetailsSave,
  type ProposalDetailsDraft,
} from "./proposalDetailsDraft"

const LABEL_CLASS = "mb-1 block text-sm font-medium"
/** Matches the Input atom so the textareas sit with the other fields. */
const TEXTAREA_CLASS =
  "w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 text-sm text-stone-800 shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[2px] focus-visible:ring-orange-500"
const LINK_BUTTON_CLASS = "text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"

const DEPOSIT_OPTIONS: Array<{ value: DepositKind; label: string }> = [
  { value: "none", label: "No deposit" },
  { value: "amount", label: "Fixed amount" },
  { value: "percent", label: "% of grand total" },
]

type UpdateDraft = (changes: Partial<ProposalDetailsDraft>) => void

/** A date field stored as a YYYY-MM-DD key ("" for none). */
const DateKeyField: React.FC<{ id: string; label: string; value: string; onChange: (value: string) => void }> = ({
  id,
  label,
  value,
  onChange,
}) => (
  <div>
    <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
    <DatePicker
      id={id}
      value={parseLocalDateKey(value)}
      onChange={(date) => onChange(toLocalDateKey(date))}
      placeholder="No date"
    />
  </div>
)

const DepositFields: React.FC<{
  draft: ProposalDetailsDraft
  saved: EstimateDetails
  grandTotal: CentsRange
  onChange: UpdateDraft
}> = ({ draft, saved, grandTotal, onChange }) => {
  const deposit = formatDeposit(draftDepositSettings(draft, saved), grandTotal)

  return (
    <fieldset className="space-y-3">
      <legend className={LABEL_CLASS}>Deposit</legend>
      <SegmentedControl
        aria-label="Deposit"
        options={DEPOSIT_OPTIONS}
        value={draft.depositKind}
        onChange={(depositKind) => onChange({ depositKind })}
      />

      {draft.depositKind !== "none" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {draft.depositKind === "amount" ? (
              <div>
                <label htmlFor="proposal-deposit-amount" className={LABEL_CLASS}>Amount ($)</label>
                <Input
                  id="proposal-deposit-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={draft.depositAmount}
                  onChange={(e) => onChange({ depositAmount: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="proposal-deposit-percent" className={LABEL_CLASS}>Percent (%)</label>
                <Input
                  id="proposal-deposit-percent"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="25"
                  value={draft.depositPercent}
                  onChange={(e) => onChange({ depositPercent: e.target.value })}
                />
              </div>
            )}
            <DateKeyField
              id="proposal-deposit-due"
              label="Due date"
              value={draft.depositDueDate}
              onChange={(depositDueDate) => onChange({ depositDueDate })}
            />
          </div>
          <div>
            <label htmlFor="proposal-deposit-note" className={LABEL_CLASS}>Deposit note</label>
            <Input
              id="proposal-deposit-note"
              placeholder="e.g. Non-refundable. Holds the date."
              value={draft.depositNote}
              onChange={(e) => onChange({ depositNote: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {deposit ? `Deposit on the current totals: ${deposit}` : "Enter an amount to print a deposit."}
          </p>
        </>
      ) : null}
    </fieldset>
  )
}

function describeTermsSource(draft: ProposalDetailsDraft, venueDefaultTerms: string | null): string {
  if (draft.termsMode === "new-venue-default") return "saves as the venue default"
  return draftFollowsVenueDefault(draft, venueDefaultTerms) ? "venue default" : "this event only"
}

const TermsField: React.FC<{
  draft: ProposalDetailsDraft
  venueDefaultTerms: string | null
  onChange: UpdateDraft
}> = ({ draft, venueDefaultTerms, onChange }) => {
  const followsDefault = draftFollowsVenueDefault(draft, venueDefaultTerms)
  const savingAsDefault = draft.termsMode === "new-venue-default"

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor="proposal-terms" className="text-sm font-medium">
          Terms <span className="font-normal text-muted-foreground">({describeTermsSource(draft, venueDefaultTerms)})</span>
        </label>
        <div className="flex gap-3">
          {!followsDefault ? (
            <button
              type="button"
              className={LINK_BUTTON_CLASS}
              onClick={() => onChange({ terms: venueDefaultTerms ?? "", termsMode: "venue-default" })}
            >
              Use venue default
            </button>
          ) : null}
          <button
            type="button"
            className={LINK_BUTTON_CLASS}
            aria-pressed={savingAsDefault}
            onClick={() =>
              onChange({
                termsMode: savingAsDefault
                  ? draft.terms.trim() === (venueDefaultTerms ?? "").trim() ? "venue-default" : "event"
                  : "new-venue-default",
              })
            }
          >
            {savingAsDefault ? "Keep for this event only" : "Save as venue default"}
          </button>
        </div>
      </div>
      <textarea
        id="proposal-terms"
        rows={5}
        value={draft.terms}
        placeholder="Payment terms, cancellation policy, minimums…"
        onChange={(e) => onChange({ terms: e.target.value })}
        className={TEXTAREA_CLASS}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {savingAsDefault
          ? "On save, these become the terms for every event that uses the venue default."
          : "Editing here changes this event only. Separate paragraphs with a blank line."}
      </p>
    </div>
  )
}

interface ProposalDetailsFormProps {
  details: EstimateDetails
  venueDefaultTerms: string | null
  grandTotal: CentsRange
  onUpdate: (updates: UpdateEstimateDetails) => void
  onSaveVenueDefault: (terms: string | null) => void
  onClose: () => void
}

/** Mounted each time the dialog opens, so the draft starts from the latest saved details. */
const ProposalDetailsForm: React.FC<ProposalDetailsFormProps> = ({
  details,
  venueDefaultTerms,
  grandTotal,
  onUpdate,
  onSaveVenueDefault,
  onClose,
}) => {
  const [draft, setDraft] = useState(() => createProposalDetailsDraft(details, venueDefaultTerms))
  const updateDraft: UpdateDraft = (changes) => setDraft((current) => ({ ...current, ...changes }))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const save = resolveProposalDetailsSave(draft, details, venueDefaultTerms)
    if (save.venueDefaultTerms !== undefined) onSaveVenueDefault(save.venueDefaultTerms)
    if (Object.keys(save.updates).length > 0) onUpdate(save.updates)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="proposal-intro" className={LABEL_CLASS}>Intro note</label>
          <textarea
            id="proposal-intro"
            rows={3}
            value={draft.introNote}
            placeholder="Printed at the top, e.g. Thank you for considering us for your event…"
            onChange={(e) => updateDraft({ introNote: e.target.value })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <DateKeyField
          id="proposal-valid-until"
          label="Valid until"
          value={draft.validUntil}
          onChange={(validUntil) => updateDraft({ validUntil })}
        />
      </div>

      <DepositFields draft={draft} saved={details} grandTotal={grandTotal} onChange={updateDraft} />

      <TermsField draft={draft} venueDefaultTerms={venueDefaultTerms} onChange={updateDraft} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  )
}

interface ProposalDetailsDialogProps extends Omit<ProposalDetailsFormProps, "onClose"> {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Edits the proposal details printed on the estimate: intro, valid-until date, deposit and terms. */
const ProposalDetailsDialog: React.FC<ProposalDetailsDialogProps> = ({ open, onOpenChange, ...formProps }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Proposal Details</DialogTitle>
        <DialogDescription>Printed on the estimate.</DialogDescription>
      </DialogHeader>
      {open ? <ProposalDetailsForm {...formProps} onClose={() => onOpenChange(false)} /> : null}
    </DialogContent>
  </Dialog>
)

export default ProposalDetailsDialog
