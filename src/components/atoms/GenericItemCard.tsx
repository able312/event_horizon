import { useState, useRef } from "react"
import { Trash2, ChevronDown } from "lucide-react"
import { centsToDollars, dollarsToCents, toCurrency } from "~/features/event-detail/workspace/lib/financial"

interface BaseItem {
  id: string
  name: string
  quantity: number | null
  serviceStyle: string | null
  includes: string | null
  unitPriceCents: number | null
}

interface ItemCardProps {
  item: BaseItem
  updateItem: (field: keyof BaseItem, value: BaseItem[keyof BaseItem]) => void
  removeItem: () => void
  serviceStyleOptions: string[]
  includesPlaceholder?: string
  color?: string
}

function calculateTotal(item: BaseItem): number {
  return (item.unitPriceCents || 0) * (item.quantity || 0)
}

function GenericItemCard({ 
  item, 
  updateItem, 
  removeItem, 
  serviceStyleOptions, 
  includesPlaceholder = "Notes...",
  color = "stone",
}: ItemCardProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const handleTitleClick = (id: string) => {
    setEditingItemId(id)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const handleTitleBlur = () => setEditingItemId(null)

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") setEditingItemId(null)
  }

  const total = calculateTotal(item)

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 font-sans">
      <div className={`flex items-center justify-between px-3.5 py-2.5 bg-${color}-50 border-b border-stone-200`}>
        <div>
          {editingItemId === item.id ? (
            <input
              ref={editInputRef}
              type="text"
              defaultValue={item.name}
              onBlur={(e) => { handleTitleBlur(); updateItem("name", e.target.value); }}
              onKeyDown={handleTitleKeyDown}
              placeholder="Item name..."
              className={`w-full border-0 border-b-2 border-amber-400 bg-transparent text-[15px] font-semibold text-${color}-800 outline-none pb-0.5 -tracking-wide`}
            />
          ) : (
            <span
              onClick={() => handleTitleClick(item.id)}
              className={`text-[15px] font-semibold cursor-text border-b-2 border-transparent hover:border-stone-200 pb-0.5 inline-block transition-colors duration-150 ${item.name ? `text-${color}-800` : "text-stone-400"}`}
            >
              {item.name || "New Item"}
            </span>
          )}
        </div>

        <button
          onClick={removeItem}
          className="bg-none border-none cursor-pointer text-stone-300 flex items-center p-0.5 rounded transition-colors hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col justify-between h-[calc(100%-48.5px)]">
        <div>
          
        
          <div className="grid grid-cols-[1fr_1.6fr] gap-2.5 mb-3">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1">
                Qty
              </label>
              <input
                type="number"
                defaultValue={item.quantity || ""}
                onBlur={(e) => updateItem("quantity", parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-[13px] border border-stone-200 rounded-lg bg-stone-50 text-stone-800 outline-none transition-colors duration-150 font-mono focus:border-amber-400"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1">
                Service Style
              </label>
              <div className="relative">
                <select
                  defaultValue={item.serviceStyle ?? ""}
                  onBlur={(e) => updateItem("serviceStyle", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-stone-200 rounded-lg bg-stone-50 text-stone-800 outline-none appearance-none cursor-pointer transition-colors duration-150 font-sans focus:border-amber-400"
                >
                  <option value="">Select...</option>
                  {serviceStyleOptions.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-3.5">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1">
              Includes / Notes
            </label>
            <textarea
              defaultValue={item.includes ?? ""}
              onBlur={(e) => updateItem("includes", e.target.value)}
              placeholder={includesPlaceholder}
              rows={item.includes?.split("\n").length ?? 2}
              className="w-full px-2.5 py-2 text-[13px] border border-stone-200 rounded-lg bg-stone-50 text-stone-800 outline-none resize-y leading-relaxed transition-colors duration-150 font-sans focus:border-amber-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-stone-400 pointer-events-none">$</span>
              <input
                type="number"
                step="0.01"
                defaultValue={item.unitPriceCents ? centsToDollars(item.unitPriceCents).toFixed(2) : ""}
                onBlur={(e) => {
                  const cents = Math.max(0, dollarsToCents(e.target.value))
                  updateItem("unitPriceCents", cents)
                }}
                placeholder="0.00"
                className="w-20 px-4 py-1 text-[13px] border border-stone-200 rounded-lg bg-stone-50 text-stone-800 outline-none transition-colors duration-150 font-mono focus:border-amber-400"
              />
            </div>
            <span className="text-[12px] text-stone-400">×</span>
            <span className="text-[13px] text-stone-500 font-mono min-w-[16px]">
              {item.quantity || 0}
            </span>
          </div>

          <div className={`rounded-lg px-3 py-1 flex items-center gap-1 ${total > 0 ? "bg-amber-50" : "bg-stone-100"}`}>
            <span className={`text-[15px] font-bold font-mono -tracking-wide ${total > 0 ? "text-amber-700" : "text-stone-300"}`}>
              {toCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GenericItemCard
