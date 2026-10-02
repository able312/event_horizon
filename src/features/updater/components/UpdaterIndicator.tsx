import { CircleX, LoaderCircle } from "lucide-react"

import { useWindowFocused } from "../hooks/useWindowFocused"
import { restartAndInstall } from "../lib/restartAndInstall"
import { ACTIONS, shouldAnnounceReady } from "../state/updaterReducer"
import { useUpdater } from "../state/useUpdater"
import { DownloadProgressRing } from "./DownloadProgressRing"
import { UpdateReadyButton } from "./UpdateReadyButton"
import { UpdaterStatusIcon } from "./UpdaterStatusIcon"

export const UpdaterIndicator: React.FC = () => {
  const { updater, dispatch } = useUpdater()
  const isWindowFocused = useWindowFocused()
  const { status } = updater

  switch (status.phase) {
    case "idle":
    case "checking":
      return null
    case "downloading":
      return <DownloadProgressRing version={status.version} percent={status.percent} />
    case "preparing":
      return (
        <UpdaterStatusIcon label={`Preparing v${status.version}…`}>
          <LoaderCircle className="size-4 animate-spin text-stone-400" />
        </UpdaterStatusIcon>
      )
    case "ready":
      return (
        <UpdateReadyButton
          version={status.version}
          installFailed={status.installFailed}
          shouldAnnounce={shouldAnnounceReady(updater, isWindowFocused)}
          onAnnounced={() => dispatch({ type: ACTIONS.READY_ANNOUNCED })}
          onInstall={restartAndInstall}
        />
      )
    case "error":
      return (
        <UpdaterStatusIcon label={`Update failed: ${status.message}`}>
          <CircleX className="size-5 text-red-500" />
        </UpdaterStatusIcon>
      )
  }
}
