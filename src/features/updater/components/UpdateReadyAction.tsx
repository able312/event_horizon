import { useWindowFocused } from "../hooks/useWindowFocused"
import { restartAndInstall } from "../lib/restartAndInstall"
import { ACTIONS, shouldAnnounceReady } from "../state/updaterReducer"
import { useUpdater } from "../state/useUpdater"
import { UpdateReadyButton } from "./UpdateReadyButton"

interface UpdateReadyActionProps {
  className?: string
}

// Connects the ready button to the updater state. Renders nothing unless an update is ready.
export const UpdateReadyAction: React.FC<UpdateReadyActionProps> = ({ className }) => {
  const { updater, dispatch } = useUpdater()
  const isWindowFocused = useWindowFocused()
  const { status } = updater

  if (status.phase !== "ready") return null

  return (
    <UpdateReadyButton
      version={status.version}
      installFailed={status.installFailed}
      shouldAnnounce={shouldAnnounceReady(updater, isWindowFocused)}
      onAnnounced={() => dispatch({ type: ACTIONS.READY_ANNOUNCED })}
      onInstall={restartAndInstall}
      className={className}
    />
  )
}
