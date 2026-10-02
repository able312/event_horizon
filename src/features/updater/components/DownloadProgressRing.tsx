import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"

const RADIUS = 6
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface DownloadProgressRingProps {
  version: string
  percent: number
}

export const DownloadProgressRing: React.FC<DownloadProgressRingProps> = ({ version, percent }) => {
  const rounded = Math.round(percent)
  const label = `Downloading v${version} · ${rounded}%`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="progressbar"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          className="flex size-6 items-center justify-center rounded-full"
        >
          <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden="true">
            <circle cx="8" cy="8" r={RADIUS} fill="none" strokeWidth="2" className="stroke-stone-700" />
            <circle
              cx="8"
              cy="8"
              r={RADIUS}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
              className="stroke-stone-400 transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
            />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
