import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { sortTimeblocksByTime } from "~/features/preview/preferences/selectors"
import { PreviewMarkdownContent } from "~/lib/markdown/PreviewMarkdownContent"

type VendorDetailsProps = {
  vendors?: TimeblockWithItems[] | null
  selectedIds?: string[]
}

export const VendorDetails = ({ vendors, selectedIds }: VendorDetailsProps) => {
  const selectedSet = selectedIds ? new Set(selectedIds) : null
  const sorted = sortTimeblocksByTime(vendors).filter((vendor) =>
    selectedSet ? selectedSet.has(vendor.id) : true,
  )

  if (sorted.length === 0) return null

  return (
    <>
      {sorted.map((vendor) => (
        <div key={vendor.id} className="mb-3 border-b border-stone-200 pb-3 last:mb-0 last:border-b-0 last:pb-0">
          <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1.4fr] gap-x-3 text-sm">
            <p className="font-semibold">{vendor.title}</p>
            <p>{vendor.vendorItem?.contactName ?? ""}</p>
            <p>{vendor.vendorItem?.contactPhone ?? ""}</p>
            <p className="truncate">{vendor.vendorItem?.contactEmail ?? ""}</p>
          </div>
          {vendor.details?.trim() ? (
            <div className="mt-1 text-sm text-stone-700">
              <PreviewMarkdownContent source={vendor.details} />
            </div>
          ) : null}
        </div>
      ))}
    </>
  )
}
