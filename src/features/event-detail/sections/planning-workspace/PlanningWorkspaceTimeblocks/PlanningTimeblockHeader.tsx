import { Clock3, Trash2, Grid2X2Plus } from 'lucide-react'

import { Button } from '~/components/ui/button'
import type { UpdateTimeblock } from '~/definitions/database'

interface PlanningTimeBlockHeaderProps {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    sectionTitle: string,
    time: string,
    assignedTo: string,
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
    removeTimeblock: (id: string) => void

    
}

const PlanningTimeBlockHeader: React.FC<PlanningTimeBlockHeaderProps> = ({
    timeblockID,
    title,
    titlePlaceholder,
    sectionTitle,
    time,
    assignedTo,
    updateTimeblock,
    removeTimeblock
}) => {

    return (
        <div className="border-b border-border/70 bg-muted/15 px-3 pt-1 pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-6 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)] items-center">
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
                    className="h-9 w-full rounded-xs border-b border-border bg-background px-2.5 text-md font-bold outline-none transition-colors focus:border-primary"
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
                    className="h-9 w-full rounded-xs border-b border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
                </label>
            </div>

            <div className="flex">
                <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => console.log("Create Set Up instructions for: " + timeblockID)}
                className="justify-start text-muted-foreground hover:text-destructive lg:justify-center"
                >
                    <Grid2X2Plus />
                    Create Setup
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTimeblock(timeblockID)}
                    className="justify-start text-muted-foreground hover:text-destructive lg:justify-center"
                >
                    <Trash2 />
                </Button>
            </div>
            </div>
        </div>
    )
}

export default PlanningTimeBlockHeader