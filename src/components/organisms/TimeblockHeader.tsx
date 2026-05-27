import { Clock3, UserPen } from 'lucide-react'

import type { UpdateTimeblock } from '~/definitions/database'

import { Input } from '~/components/atoms/input'

interface PlanningTimeBlockHeaderProps {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    sectionTitle: string,
    time: string,
    assignedTo: string,
    tail: React.ReactNode
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
}

const PlanningTimeBlockHeader:React.FC<PlanningTimeBlockHeaderProps> = ({
    timeblockID,
    title,
    titlePlaceholder,
    sectionTitle,
    time,
    assignedTo,
    tail,
    updateTimeblock,
}) => {

    return (
        <div className="bg-stone-800 rounded-t-xs shadow-lg border-b border-border/70 relative z-10">
            <div className="flex gap-3 flex-row items-start justify-between">
                <div className="flex gap-6 justify-start items-center text-white max-w-7/8 group">
                    {/* Time */}
                    <label className="space-y-1 self-stretch max-w-22 border-r-1 border-stone-300">
                        <div className={`flex items-center h-full gap-2 px-2 rounded-tl-xs ${time ? "bg-stone-700 hover:bg-stone-600" : "bg-orange-500 hover:bg-orange-400"}`}>
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

                    { tail }

                </div>
            </div>
        </div>
    )
}

export default PlanningTimeBlockHeader