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
      className={`w-full rounded-md border px-2 py-2 text-left transition-colors ${
        isSelected
          ? "border-white/60 bg-white/15"
          : "border-transparent bg-transparent hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-100 truncate">{node.label}</p>
        {node.time ? <span className="text-xs font-mono text-stone-300">{node.time}</span> : null}
      </div>
      {node.subLabel ? <p className="text-xs text-stone-400 mt-1">{node.subLabel}</p> : null}
    </button>
  )
}

export default WorkspaceNavNodeRow
