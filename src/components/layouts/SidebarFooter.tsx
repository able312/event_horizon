import { UpdateReadyAction } from "~/features/updater/components/UpdateReadyAction"
import { UpdaterIndicator } from "~/features/updater/components/UpdaterIndicator"
import { UpdaterDevControls } from "~/features/updater/dev/UpdaterDevControls"
import { useUpdater } from "~/features/updater/state/useUpdater"
import { AuthButton } from "~/features/auth"
import { SettingsButton } from "~/features/settings/components/SettingsButton"

export const SidebarFooter: React.FC = () => {
  const isUpdateReady = useUpdater().updater.status.phase === "ready"
  return isUpdateReady ? <UpdateReadyFooter /> : <DefaultFooter />
}

const DefaultFooter: React.FC = () => {
  return (
    <div
      className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 border-t border-white/10 pl-3 pr-2"
      data-testid="sidebar-footer"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <SettingsButton className="-ml-1" />
        <span>v{__APP_VERSION__}</span>
        <span className="rounded-sm border border-stone-700 px-1 uppercase tracking-wide">
          Alpha
        </span>
        {import.meta.env.DEV && <UpdaterDevControls />}
        <UpdaterIndicator />
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        <AuthButton variant="ghost" size="sm" showUserName={false} />
      </div>
    </div>
  )
}

// While an update is waiting, the whole footer turns orange so it can't be missed:
// settings stays at the far left, the update button takes the larger left side
// and sign out sits on the right.
const UpdateReadyFooter: React.FC = () => {
  return (
    <div
      className="flex min-h-11 shrink-0 items-stretch bg-orange-500 text-white"
      data-testid="sidebar-footer"
      data-update-ready=""
    >
      <div className="flex items-center pl-2">
        <SettingsButton className="text-white/80 hover:bg-white/15 hover:text-white dark:hover:bg-white/15" />
      </div>
      {import.meta.env.DEV && (
        <div className="flex items-center pl-1 [&_button]:text-white/70 [&_button:hover]:text-white">
          <UpdaterDevControls />
        </div>
      )}
      <UpdateReadyAction className="min-w-0 flex-[3] px-3" />
      <div className="my-2 w-px shrink-0 bg-white/30" aria-hidden="true" />
      <AuthButton
        variant="ghost"
        size="sm"
        showUserName={false}
        className="h-auto min-w-0 flex-[2] shrink rounded-none px-2 text-white hover:bg-white/15 hover:text-white dark:hover:bg-white/15"
      />
    </div>
  )
}
