/**
 * Cell spacing for the Financials tables. Roomier than the shared planning table styles
 * (`tableStyles.ts`), with an extra inset on the outer columns so figures don't sit against
 * the card edge.
 */
const EDGE_INSET_CLASS = "first:pl-4 last:pr-4"

export const FINANCIAL_TABLE_HEAD_CELL_LEFT_CLASS = `px-3 py-2 text-left font-medium whitespace-nowrap ${EDGE_INSET_CLASS}`
export const FINANCIAL_TABLE_HEAD_CELL_RIGHT_CLASS = `px-3 py-2 text-right font-medium whitespace-nowrap ${EDGE_INSET_CLASS}`
export const FINANCIAL_TABLE_BODY_CELL_CLASS = `px-3 py-2 ${EDGE_INSET_CLASS}`
