import React from "react"
import { Plus } from "lucide-react"
import type { UpdateTimeblock } from "~/definitions/database"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import DetailsTimeblock from "~/components/ui/DetailsTimeblock"

const SetupInstructionsSection: React.FC = () => {
  // TODO: useSetupInstructionsSection hook
  const { data: setupInstructions, addSetupInstruction, updateSetupInstruction, updateTimeblock, removeTimeblock } = useSetupInstructionSection()

  const handleUpdateTimeblock = (id: string, updates: UpdateTimeblock) => {
    updateTimeblock({id, updates})
  }
  const handleRemoveTimeblock = (id:string) => {
    removeTimeblock(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm mb-3">Setup Instructions</h4>
        
        { !setupInstructions || setupInstructions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No setup instructions added yet.</p>
        ) : (
          <div className="space-y-4">
            {setupInstructions.map((timeblock) => (
              <DetailsTimeblock
                key={timeblock.id}
                timeblock={timeblock}
                titlePlaceholder="Note Title"
                onEdit={handleUpdateTimeblock}
                onRemove={handleRemoveTimeblock}
              >
                <div className="mt-4">
                  <label className="text-xs text-muted-foreground">Instructions</label>
                  <textarea
                    defaultValue={timeblock.setupInstruction?.instruction || ""}
                    placeholder="Describe what needs to be done..."
                    className="w-full px-2 py-1 text-sm border rounded bg-white mt-1 resize-none"
                    onBlur={(e) => updateSetupInstruction({id: timeblock.setupInstruction!.id, updates: {instruction: e.target.value}})}
                    rows={timeblock.setupInstruction?.instruction?.split("\n").length ?? 2}
                  />
                </div>
              </DetailsTimeblock>
            ))}
          </div>
        )}
        
        <button
          onClick={() => addSetupInstruction()}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add Setup Instruction
        </button>
      </div>
    </div>
  )
}

export default SetupInstructionsSection
