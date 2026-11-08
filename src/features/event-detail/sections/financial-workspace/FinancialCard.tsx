import React from "react"

/** Card shell used across the Financials workspace. */
export const FINANCIAL_CARD_CLASS = "rounded-xs border border-border bg-background p-3 shadow-sm"

/** Muted, dashed box for "nothing here yet" states, matching the Overview cards. */
export const FINANCIAL_EMPTY_STATE_CLASS =
  "rounded-xs border border-dashed border-border px-3 py-3 text-xs text-muted-foreground"

interface FinancialCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Buttons shown on the right of the header. */
  actions?: React.ReactNode
  /** Right-aligned summary line under the content, e.g. a subtotal. */
  footer?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/** A Financials card with the same header as the Overview cards: title, muted description, divider. */
const FinancialCard: React.FC<FinancialCardProps> = ({ title, description, actions, footer, className, children }) => (
  <section className={`${FINANCIAL_CARD_CLASS} ${className ?? ""}`}>
    <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
    {children != null ? <div className="pt-3">{children}</div> : null}
    {footer ? (
      <div className="mt-2 border-t border-border pt-2 text-right text-xs font-medium tabular-nums text-foreground">
        {footer}
      </div>
    ) : null}
  </section>
)

export default FinancialCard
