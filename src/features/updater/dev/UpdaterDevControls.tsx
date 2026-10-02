import { Bug } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "~/components/atoms/popover"

import { useUpdater } from "../state/useUpdater"
import { SIMULATED_STATUSES, runSimulatedDownload, setSimulatedStatus } from "./updaterSimulation"

const STEP_BUTTON_CLASS =
  "rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent"

// Dev-only: steps the updater UI through its states without a main-process updater.
export const UpdaterDevControls: React.FC = () => {
  const { updater, dispatch } = useUpdater()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Updater dev controls"
          className="flex size-6 items-center justify-center rounded-full text-stone-600 transition-colors hover:text-stone-300"
        >
          <Bug className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="flex w-48 flex-col gap-0.5 p-2">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Updater · {updater.status.phase}
        </p>
        <button
          type="button"
          className={`${STEP_BUTTON_CLASS} font-medium text-orange-500`}
          onClick={() => runSimulatedDownload(dispatch)}
        >
          Run full download
        </button>
        {SIMULATED_STATUSES.map(({ label, status }) => (
          <button
            key={label}
            type="button"
            className={STEP_BUTTON_CLASS}
            onClick={() => setSimulatedStatus(dispatch, status)}
          >
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
