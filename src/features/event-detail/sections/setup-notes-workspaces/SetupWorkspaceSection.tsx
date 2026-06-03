import { Plus } from "lucide-react"
import { Button } from "~/components/atoms/button"
import NoteHeavyTimeblock from "./NoteHeavyTimeblock"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"

const SetupWorkspaceSection = () => {

    const { data, updateTimeblock, addSetupInstruction, removeTimeblock } = useSetupInstructionSection()

    const setupItems = data ?? []

    return(
        <div className="space-y-4">

            {/* Page Title */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold tracking-wide">Setup Instructions</h3>
                    <p className="text-xs text-muted-foreground">Instructions and timing for setting up key portions of the event.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={ () => addSetupInstruction() }>
                    <Plus />
                    Add New Setup Instruction
                </Button>
            </div>

            {/* Timeblock Cards */}
            <div className="grid gap-y-12 gap-x-4">
                { !setupItems?.length || setupItems.length < 1 ? (
                    <div className="rounded-xs border border-dashed border-border bg-orange-50 px-4 py-4">
                        <p className="text-sm text-muted-foreground">No Setup Instruction Timeblocks. Create one in the top right corner to get started.</p>
                    </div>
                ) : (    
                    setupItems.map((item) => (
                        <NoteHeavyTimeblock 
                            key={item.id + "_" +item?.vendorItem?.id}
                            timeblockID={ item.id }
                            title={ item.title }
                            titlePlaceholder="e.g. Pavilion Setup, Buffet Setup"
                            time={ item.time ?? "" }
                            assignedTo={ item.assignedTo ?? "" }
                            notes={ item.details ?? ""}
                            sectionTitle={ "Setup Instruction" }
                            contentPlaceholder="What does staff need to know?"
                            updateTimeblock={ updateTimeblock }
                            deleteTimeblock={ () => removeTimeblock( item.id ) }
                        />
                    ))
                )}
            </div>
        </div>
    )
}

export default SetupWorkspaceSection