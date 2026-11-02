import { CircleX, LoaderCircle } from "lucide-react"

import { useUpdater } from "../state/useUpdater"
import { DownloadProgressRing } from "./DownloadProgressRing"
import { UpdaterStatusIcon } from "./UpdaterStatusIcon"

export const UpdaterIndicator: React.FC = () => {
  const { status } = useUpdater().updater

  switch (status.phase) {
    // A ready update takes over the whole footer instead (see UpdateReadyAction).
    case "idle":
    case "checking":
    case "ready":
      return null
    case "downloading":
      return <DownloadProgressRing version={status.version} percent={status.percent} />
    case "preparing":
      return (
        <UpdaterStatusIcon label={`Preparing v${status.version}…`}>
          <LoaderCircle className="size-4 animate-spin text-stone-400" />
        </UpdaterStatusIcon>
      )
    case "error":
      return (
        <UpdaterStatusIcon label={`Update failed: ${status.message}`}>
          <CircleX className="size-5 text-red-500" />
        </UpdaterStatusIcon>
      )
  }
}
