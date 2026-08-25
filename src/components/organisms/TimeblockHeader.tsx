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
    updateTimeblock: (payload: { id: string, updates: UpdateTimeblock }) => void,
}

// Small local helpers so the JSX below isn't full of .join(" ") noise.
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(" ")

const BREAKPOINT = "@max-[54rem]/timeblockHeader"
const narrow = (classes: string) =>
    classes
        .split(" ")
        .map((c) => `${BREAKPOINT}:${c}`)
        .join(" ")

const TimeBlockHeader: React.FC<TimeBlockHeaderProps> = ({
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
    const labelPrefix = `${sectionTitle}: ${timeblockName}`

    return (
        <div className="@container/timeblockHeader bg-stone-800 rounded-t-xs shadow-lg border-b border-border/70 relative z-10">
            {/*
              One assigned-to input; container query moves it from the title row
              (wide) to a full-width second row (narrow) via CSS Grid placement.
            */}
            <div
                className={cx(
                    "grid items-stretch text-white group",
                    "grid-cols-[auto_minmax(21.25rem,1fr)_auto_auto]",
                    narrow("grid-cols-[auto_minmax(0,1fr)_auto]"),
                )}
            >
                {/* Time — always row 1, col 1 */}
                <label
                    className={cx(
                        "col-start-1 row-start-1 space-y-1 self-stretch max-w-22 border-r-1 border-stone-300",
                        "flex items-center justify-center h-full gap-2 px-2 rounded-tl-xs",
                        time ? "bg-stone-700 hover:bg-stone-600" : "bg-orange-500 hover:bg-orange-400",
                    )}
                >
                    <input
                        type="time"
                        defaultValue={time}
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { time: e.target.value } })}
                        aria-label={`${labelPrefix} time`}
                        className="bg-transparent text-sm font-bold outline-none w-full text-center max-w-fit"
                    />
                </label>

                {/* Title — the primary field, styled with more visual weight */}
                <label
                    className={cx(
                        "col-start-2 row-start-1 space-y-1 border-r-1 border-stone-300 px-4 py-1.5 min-w-85",
                        narrow("border-r-stone-800 min-w-0"),
                    )}
                >
                    <Input
                        type="text"
                        variant="ghost"
                        defaultValue={title}
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { title: e.target.value } })}
                        placeholder={titlePlaceholder}
                        aria-label={`${labelPrefix} title`}
                        className="text-base font-semibold tracking-tight"
                    />
                </label>

                {/* Assigned To — secondary field, deliberately quieter than the title */}
                <label
                    className={cx(
                        "col-start-3 row-start-1 space-y-1 self-center px-4 py-1.5",
                        narrow("col-start-1 col-span-3 row-start-2 self-stretch px-0 py-0"),
                    )}
                >
                    <Input
                        type="text"
                        variant="darkSecondary"
                        defaultValue={assignedTo}
                        onBlur={(e) => updateTimeblock({ id: timeblockID, updates: { assignedTo: e.target.value } })}
                        placeholder="Assign staff"
                        aria-label={`${labelPrefix} assigned to`}
                        className={cx(
                            "text-sm text-stone-300 placeholder-stone-500 w-fit",
                            narrow(
                                cx(
                                    "w-full bg-stone-200 text-stone-900 placeholder-stone-500",
                                    "rounded-none p-1 border-t-0.5 border-x-0 border-t-0 border-stone-300",
                                    "hover:border-b-stone-300 focus:border-b-orange-500",
                                    "focus-visible:border-stone-600 focus-visible:border-b-orange-500 focus-visible:ring-0",
                                ),
                            ),
                        )}
                    />
                </label>

                {/* Tail — action zone, given a hairline separator on wide layouts */}
                <div
                    className={cx(
                        "col-start-4 row-start-1 flex justify-end self-stretch text-white border-l border-stone-700/70",
                        narrow("col-start-3 border-l-0"),
                    )}
                >
                    {tail}
                </div>
            </div>
        </div>
    )
}

export default TimeBlockHeader