import { Clock3, Plus, ChevronDown, UserPen } from 'lucide-react'

import { Button } from '~/components/ui/button'
import type { UpdateTimeblock } from '~/definitions/database'

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { useSetupInstructionSection } from '~/hooks/useSetupInstrucionSection'
import { toast } from 'sonner'
import type { WorkspaceItemBase } from './PlanningWorkspaceTimeblockList'
import { Input } from '~/components/ui/input'

interface PlanningTimeBlockHeaderProps<TItem extends WorkspaceItemBase> {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    sectionTitle: string,
    time: string,
    assignedTo: string,
    addItemLabel: string,
    timeblockItems: TItem[],
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
    removeTimeblock: (id: string) => void,
    addItem: (payload: { timeblockId: string }) => void
}

function PlanningTimeBlockHeader<TItem extends WorkspaceItemBase> ({
    timeblockID,
    title,
    titlePlaceholder,
    sectionTitle,
    time,
    assignedTo,
    addItemLabel,
    timeblockItems,
    updateTimeblock,
    removeTimeblock,
    addItem
}: PlanningTimeBlockHeaderProps<TItem>) {

    const { addSetupInstruction } = useSetupInstructionSection()

    const handlePortToSetup = async () => {
        try {
            const body = timeblockItems
                .map((item) => `## ${item.name}\n# ${item.serviceStyle}\n${item.includes}\n\n`)
                .join('')

            addSetupInstruction({
                title: title + " Setup",
                details: body
            })
            
            toast.success("Created " + title + " Setup")
            console.log("SUCCESS")

        } catch(err) {
            toast.error("Failed to create setup instructions.")
            console.error(err)
        }
    }

    return (
        <div className="bg-stone-800 rounded-t-sm border-b border-border/70">
            <div className="flex gap-3 flex-row items-start justify-between">
                <div className="flex gap-6 justify-start items-center text-white max-w-7/8 group">
                    {/* Time */}
                    <label className="space-y-1 self-stretch max-w-22 border-r-1 border-stone-300">
                        <div className={`flex items-center h-full gap-2 px-2 rounded-tl-sm ${time ? "bg-stone-700 hover:bg-stone-600" : "bg-orange-500 hover:bg-orange-400"}`}>
                            <Clock3 size={ 16 } />
                            <input
                                type="time"
                                defaultValue={time}
                                onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { time: e.target.value } })}
                                aria-label={`${sectionTitle} time`}
                                className="bg-transparent text-sm font-bold outline-none w-full text-center"
                            />
                        </div>
                    </label>

                    {/* Title */}
                    <label className="space-y-1 border-r-1 border-stone-300 pr-6 py-1.5 min-w-68">
                        <Input
                            type="text"
                            variant="ghost"
                            defaultValue={ title }
                            onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { title: e.target.value } })}
                            placeholder={titlePlaceholder}
                            aria-label={`${sectionTitle} title`}
                        />
                    </label>
                
                    <label className="space-y-1 flex items-center gap-2 py-1.5">
                        <span className="text-[11px] font-medium text-xs uppercase text-stone-200 w-6 m-0"><UserPen size={20} /></span>
                        <Input
                            type="text"
                            variant="darkSecondary"
                            defaultValue={ assignedTo }
                            onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { assignedTo: e.target.value } })}
                            placeholder="Assign staff"
                            aria-label="Assigned To"
                            className={""}
                        />
                    </label>
                </div>

                <div className="flex self-stretch text-white">

                    <Button type="button" variant="ghost" size="sm" className="rounded-none border-x border-stone-700 h-full m-0 hover:bg-stone-600 hover:text-orange-500" onClick={() => addItem({ timeblockId: timeblockID })}>
                        <Plus />
                        {addItemLabel}
                    </Button>

                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            aria-label="Calendar ID actions"
                            className=" rounded-none rounded-tr-sm h-full m-0 hover:bg-stone-600 hover:text-orange-500"
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