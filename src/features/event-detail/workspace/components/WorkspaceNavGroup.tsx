import WorkspaceNavNodeRow from "./WorkspaceNavNodeRow"
import type { WorkspaceNavNode } from "../types"

interface WorkspaceNavGroupProps {
  title: string
  emptyCopy: string
  nodes: WorkspaceNavNode[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

const WorkspaceNavGroup: React.FC<WorkspaceNavGroupProps> = ({
  title,
  emptyCopy,
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-stone-400 mb-2">{title}</h3>
      {nodes.length === 0 ? (
        <p className="text-xs text-stone-500">{emptyCopy}</p>
      ) : (
        <div className="space-y-1">
          {nodes.map((node) => (
            <WorkspaceNavNodeRow
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onSelect={onSelectNode}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default WorkspaceNavGroup
