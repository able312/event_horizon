import type { ReactNode } from "react"

import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"

/** The event's intro note, printed under the estimate header. */
export function EstimateIntroNote({ note }: { note: string }) {
  return <p className="mb-6 whitespace-pre-line text-sm">{note}</p>
}

/** The deposit asked for, printed under the totals. */
export function EstimateDeposit({
  amount,
  dueDate,
  note,
}: {
  amount: string
  dueDate: string | null
  note: string | null
}) {
  return (
    <div className="flex justify-end">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Deposit</dt>
        <dd className="text-end font-medium">{amount}</dd>
        {dueDate ? (
          <>
            <dt className="text-muted-foreground">Deposit Due</dt>
            <dd className="text-end font-medium">{dueDate}</dd>
          </>
        ) : null}
        {note ? <dd className="col-span-2 whitespace-pre-line text-end text-xs text-stone-600">{note}</dd> : null}
      </dl>
    </div>
  )
}

/**
 * The terms: one block per paragraph so long terms can break across pages.
 * Returns PreviewBlocks (not a component) because PreviewDocument paginates its direct blocks.
 */
export function renderEstimateTermsBlocks(terms: string): ReactNode[] {
  const paragraphs = terms.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  if (paragraphs.length === 0) return []

  // The heading shares the first paragraph's block so it never ends a page on its own.
  return paragraphs.map((paragraph, index) => (
    <PreviewBlock key={`financial-terms-${index}`} id={`financial-terms-${index}`} className="mb-2">
      {index === 0 ? <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-wide">Terms</h2> : null}
      <p className="whitespace-pre-line text-xs">{paragraph}</p>
    </PreviewBlock>
  ))
}
