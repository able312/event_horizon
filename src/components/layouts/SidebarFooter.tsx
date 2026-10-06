import { UpdaterIndicator } from "~/features/updater/components/UpdaterIndicator"
import { UpdaterDevControls } from "~/features/updater/dev/UpdaterDevControls"

export const SidebarFooter: React.FC = () => {
  return (
    <div
      className="flex h-8 shrink-0 items-center justify-between border-t border-white/10 pl-3 pr-2"
      data-testid="sidebar-footer"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <span>v{__APP_VERSION__}</span>
        <span className="rounded-sm border border-stone-700 px-1 uppercase tracking-wide">
          Alpha
        </span>
        {import.meta.env.DEV && <UpdaterDevControls />}
      </div>
      <UpdaterIndicator />
    </div>
  )
}
