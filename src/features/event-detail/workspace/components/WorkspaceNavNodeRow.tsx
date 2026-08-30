import type { WorkspaceNavNode } from "../types"

interface WorkspaceNavNodeRowProps {
  node: WorkspaceNavNode
  isSelected: boolean
  onSelect: (nodeId: string) => void
}

const WorkspaceNavNodeRow: React.FC<WorkspaceNavNodeRowProps> = ({ node, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-current={isSelected ? "true" : undefined}
      className={`w-full border px-2.5 py-2.5 text-left transition-colors ${
        isSelected
          ? "border-orange-500/40 bg-white/15 border-l-3 border-l-orange-500"
          : "border-transparent bg-transparent hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-sm font-medium text-stone-100 truncate min-w-0 flex-1">{node.label}</p>
        {node.time ? (
          <span className="text-xs font-mono text-stone-300 shrink-0">{node.time}</span>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
        {node.subLabel ? (
          <p className="text-xs text-stone-400 truncate">{node.subLabel}</p>
        ) : (
          <span />
        )}
        {node.assignedTo ? (
          <p className="text-xs text-stone-500 truncate shrink-0 max-w-[45%]">{node.assignedTo}</p>
        ) : null}
      </div>
    </button>
  )
}

export default WorkspaceNavNodeRow
