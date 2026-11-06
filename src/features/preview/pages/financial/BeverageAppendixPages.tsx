import { Fragment, type ReactNode } from "react"

import type { BeverageItemType } from "~/definitions/database"
import type { BeverageItemWithAssignments } from "~/definitions/beverage/beverage-types"
import { toCurrency } from "~/features/event-detail/workspace/lib/financial"
import { PreviewBlock } from "~/features/preview/pagination/PreviewDocument"
import {
  formatPreviewPrice,
  formatPreviewQuantity,
} from "~/features/preview/preferences/selectors"

export const BEVERAGE_APPENDIX_CONTINUATION_KEY = "beverage-appendix"

export const beverageAppendixContinuationHeading = (
  <h2 className="mb-2 text-lg font-bold">Beverage Availability (continued)</h2>
)

/**
 * The beverage availability appendix: a heading on a new page, then one block per beverage
 * type. Returns PreviewBlocks (not a component) because PreviewDocument paginates its direct blocks.
 */
export function renderBeverageAppendixPages(params: {
  sections: Array<{ type: BeverageItemType; items: BeverageItemWithAssignments[] }>
  showNotes: boolean
}): ReactNode[] {
  return [
    <PreviewBlock
      key="financial-beverage-appendix-header"
      id="financial-beverage-appendix-header"
      continuationKey={BEVERAGE_APPENDIX_CONTINUATION_KEY}
      breakBefore
      keepTogether
    >
      <div>
        <h2 className="text-lg font-bold">Beverage Availability</h2>
        <p className="mb-4 mt-1 text-sm text-stone-600">
          Separate list of beverages available during the event. This is not an additional
          charge table — priced quantities already included in the estimate appear above.
        </p>
      </div>
    </PreviewBlock>,
    ...params.sections.map((section) => (
      <PreviewBlock
        key={`financial-beverage-appendix-${section.type}`}
        id={`financial-beverage-appendix-${section.type}`}
        continuationKey={BEVERAGE_APPENDIX_CONTINUATION_KEY}
        keepTogether
        className="mb-4"
      >
        <div>
          <div className="grid grid-cols-6 border-b border-dashed border-black pt-2 text-sm">
            <p className="col-span-3 font-semibold">{section.type}</p>
            <p className="col-span-1 text-end">Cost</p>
            <p className="col-span-1 text-end">Qty.</p>
            <p className="col-span-1 text-end" />
          </div>
          <div className="grid grid-cols-6 pt-2 text-sm">
            {section.items.map((item) => (
              <Fragment key={item.id}>
                <div className="col-span-3">
                  <p className="font-bold">{item.name}</p>
                  {params.showNotes && item.includes?.trim() ? (
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-stone-600">
                      {item.includes}
                    </pre>
                  ) : null}
                </div>
                <p className="col-span-1 text-end">
                  {formatPreviewPrice(item.unitPriceCents, toCurrency)}
                </p>
                <p className="col-span-1 text-end">{formatPreviewQuantity(item.quantity)}</p>
                <p className="col-span-1 text-end" />
              </Fragment>
            ))}
          </div>
        </div>
      </PreviewBlock>
    )),
  ]
}
