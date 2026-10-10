import { UpdaterIndicator } from "~/features/updater/components/UpdaterIndicator"
import { UpdaterDevControls } from "~/features/updater/dev/UpdaterDevControls"
import { AuthButton } from "~/features/auth"

export const SidebarFooter: React.FC = () => {
  return (
    <div
      className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 border-t border-white/10 pl-3 pr-2"
      data-testid="sidebar-footer"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <span>v{__APP_VERSION__}</span>
        <span className="rounded-sm border border-stone-700 px-1 uppercase tracking-wide">
          Alpha
        </span>
        {import.meta.env.DEV && <UpdaterDevControls />}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AuthButton variant="ghost" size="sm" showUserName={false} />
        <UpdaterIndicator />
      </div>
    </div>
  )
}
