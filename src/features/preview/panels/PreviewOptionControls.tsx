import type { ReactNode } from "react"

import { cn } from "~/lib/utils"

export function PreviewOptionSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-stone-400">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function PreviewToggleRow({
  label,
  checked,
  onChange,
  id,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-300 hover:bg-white/5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-stone-500 bg-transparent accent-stone-100"
      />
      <span className="truncate">{label}</span>
    </label>
  )
}

export function PreviewTimeblockSelector({
  sectionLabel,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  sectionLabel: string
  options: Array<{ id: string; label: string }>
  selectedIds: string[]
  onToggle: (id: string, value: boolean) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  if (options.length === 0) return null

  const selectedSet = new Set(selectedIds)

  return (
    <div className="space-y-1 rounded-md border border-white/10 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-300">{sectionLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-400 hover:bg-white/5 hover:text-stone-200"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-400 hover:bg-white/5 hover:text-stone-200"
          >
            None
          </button>
        </div>
      </div>
      <div className="max-h-40 space-y-0.5 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-stone-300 hover:bg-white/5",
            )}
          >
            <input
              type="checkbox"
              checked={selectedSet.has(option.id)}
              onChange={(e) => onToggle(option.id, e.target.checked)}
              className="h-3 w-3 rounded border-stone-500 accent-stone-100"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
