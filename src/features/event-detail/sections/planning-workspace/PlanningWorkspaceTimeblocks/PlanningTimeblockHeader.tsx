import { Clock3, Plus, ChevronDown } from 'lucide-react'

import { Button } from '~/components/ui/button'
import type { UpdateTimeblock } from '~/definitions/database'

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useSetupInstructionSection } from '~/hooks/useSetupInstrucionSection'
import { toast } from 'sonner'

interface PlanningTimeBlockHeaderProps {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    sectionTitle: string,
    time: string,
    assignedTo: string,
    addItemLabel: string,
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
    removeTimeblock: (id: string) => void,
    addItem: (payload: { timeblockId: string }) => void
}

const PlanningTimeBlockHeader: React.FC<PlanningTimeBlockHeaderProps> = ({
    timeblockID,
    title,
    titlePlaceholder,
    sectionTitle,
    time,
    assignedTo,
    addItemLabel,
    updateTimeblock,
    removeTimeblock,
    addItem
}) => {

    const { addSetupInstruction } = useSetupInstructionSection()

    const handlePortToSetup = async () => {
        try {

            addSetupInstruction({
                title: title + " Setup",
                details: "New Details"
            })
            
            toast.success("Created " + title + " Setup")
            console.log("SUCCESS")

        } catch(err) {
            toast.error("Failed to create setup instructions.")
            console.error(err)
        }
    }

    return (
        <div className="border-b border-border/70 border-b-stone-300/75 px-3 pt-1 pb-2  bg-[#f7f6f3]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-6 md:grid-cols-[80px_1fr_1fr] items-center">
                    {/* Time */}
                    <label className="space-y-1 w-full flex justify-center items-center w-full">
                    <div className={`rounded-sm flex items-center gap-2 w-content text-white px-2 ${time ? "bg-stone-600" : "bg-orange-500"}`}>
                        <Clock3 size={ 16 } />
                        <input
                        type="time"
                        defaultValue={time}
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { time: e.target.value } })}
                        aria-label={`${sectionTitle} time`}
                        className="h-7 bg-transparent text-sm font-bold outline-none w-full text-center"
                        />
                    </div>
                    </label>

                    {/* Title */}
                    <label className="space-y-1 border-r-1 border-stone-300 pr-6">
                    <input
                        type="text"
                        defaultValue={ title }
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { title: e.target.value } })}
                        placeholder={titlePlaceholder}
                        aria-label={`${sectionTitle} title`}
                        className="h-9 w-full border-b border-stone-300 bg-transparent px-1.5 text-md font-bold outline-none transition-colors focus:border-primary"
                    />
                    </label>
                
                    <label className="space-y-1 flex items-center">
                    <span className="text-[11px] font-medium uppercase text-muted-foreground w-1/2 m-0">Assigned To</span>
                    <input
                        type="text"
                        defaultValue={ assignedTo }
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { assignedTo: e.target.value } })}
                        placeholder="Assign to..."
                        aria-label="Assigned To"
                        className="h-9 w-full border-b border-stone-300 bg-transparent px-2.5 text-sm outline-none transition-colors focus:border-primary"
                    />
                    </label>
                </div>

                <div className="flex">

                    <Button type="button" variant="outline" size="sm" className="rounded-r-none" onClick={() => addItem({ timeblockId: timeblockID })}>
                        <Plus />
                        {addItemLabel}
                    </Button>

                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label="Calendar ID actions"
                            className="rounded-l-none border-l px-2"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={ handlePortToSetup }>Create Setup Instructions</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={ () => removeTimeblock(timeblockID) }>
                            Delete Timeblock
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}

export default PlanningTimeBlockHeader