import { Clock3 } from 'lucide-react'

import type { UpdateTimeblock } from '~/definitions/database'

import { Input } from '~/components/atoms/input'

interface TimeBlockHeaderProps {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    sectionTitle: string,
    time: string,
    assignedTo: string,
    tail: React.ReactNode
    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
}

const TimeBlockHeader:React.FC<TimeBlockHeaderProps> = ({
    timeblockID,
    title,
    titlePlaceholder,
    sectionTitle,
    time,
    assignedTo,
    tail,
    updateTimeblock,
}) => {
    const timeblockName = title.trim() || "Untitled"

    return (
        <div className="@container/timeblockHeader bg-stone-800 rounded-t-xs shadow-lg border-b border-border/70 relative z-10">
            {/*
              One assigned-to input; container query moves it from the title row
              (wide) to a full-width second row (narrow) via CSS Grid placement.
            */}
            <div
                className={[
                    "grid items-stretch text-white group",
                    "grid-cols-[auto_minmax(21.25rem,auto)_auto_auto]",
                    "@max-[54rem]/timeblockHeader:grid-cols-[auto_minmax(0,1fr)_auto]",
                ].join(" ")}
            >
                {/* Time — always row 1, col 1 */}
                <label className="col-start-1 row-start-1 space-y-1 self-stretch max-w-22 border-r-1 border-stone-300">
                    <div className={`flex items-center h-full gap-2 px-2 rounded-tl-xs ${time ? "bg-stone-700 hover:bg-stone-600" : "bg-orange-500 hover:bg-orange-400"}`}>
                        <Clock3 size={ 16 } />
                        <input
                            type="time"
                            defaultValue={time}
                            onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { time: e.target.value } })}
                            aria-label={`${sectionTitle}: ${timeblockName} time`}
                            className="bg-transparent text-sm font-bold outline-none w-full text-center"
                        />
                    </div>
                </label>

                {/* Title — always row 1, col 2 */}
                <label
                    className={[
                        "col-start-2 row-start-1 space-y-1 border-r-1 border-stone-300 pr-6 py-1.5 min-w-85",
                        "@max-[54rem]/timeblockHeader:border-r-stone-800",
                        "@max-[54rem]/timeblockHeader:min-w-0",
                    ].join(" ")}
                >
                    <Input
                        type="text"
                        variant="ghost"
                        defaultValue={ title }
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { title: e.target.value } })}
                        placeholder={titlePlaceholder}
                        aria-label={`${sectionTitle}: ${timeblockName} title`}
                    />
                </label>

                {/* Assigned To — wide: row 1 col 3; narrow: row 2 full width */}
                <label
                    className={[
                        "col-start-3 row-start-1 space-y-1 self-center pr-6 py-1.5",
                        "@max-[54rem]/timeblockHeader:col-start-1",
                        "@max-[54rem]/timeblockHeader:col-span-3",
                        "@max-[54rem]/timeblockHeader:row-start-2",
                        "@max-[54rem]/timeblockHeader:self-stretch",
                        "@max-[54rem]/timeblockHeader:pr-0",
                        "@max-[54rem]/timeblockHeader:py-0",
                    ].join(" ")}
                >
                    <Input
                        type="text"
                        variant="darkSecondary"
                        defaultValue={ assignedTo }
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { assignedTo: e.target.value } })}
                        placeholder="Assign staff"
                        aria-label={`${sectionTitle}: ${timeblockName} assigned to`}
                        className={[
                            "w-full",
                            "@max-[54rem]/timeblockHeader:rounded-none",
                            "@max-[54rem]/timeblockHeader:p-1",
                            "@max-[54rem]/timeblockHeader:border-t-0.5",
                            "@max-[54rem]/timeblockHeader:border-stone-900",
                            "@max-[54rem]/timeblockHeader:hover:border-b-stone-300",
                            "@max-[54rem]/timeblockHeader:focus:border-b-orange-500",
                            "@max-[54rem]/timeblockHeader:focus-visible:border-stone-600",
                            "@max-[54rem]/timeblockHeader:focus-visible:border-b-orange-500",
                            "@max-[54rem]/timeblockHeader:focus-visible:ring-0",
                        ].join(" ")}
                    />
                </label>

                {/* Tail — wide: row 1 col 4; narrow: row 1 col 3 */}
                <div
                    className={[
                        "col-start-4 row-start-1 flex self-stretch text-white",
                        "@max-[54rem]/timeblockHeader:col-start-3",
                    ].join(" ")}
                >
                    { tail }
                </div>
            </div>
        </div>
    )
}

export default TimeBlockHeader
