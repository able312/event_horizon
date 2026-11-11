import type { ReactNode } from "react"

type SettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

/** A titled card grouping related fields within a settings category. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children }) => (
  <section className="space-y-4 rounded-lg border border-border bg-card p-4">
    <div className="space-y-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </section>
)
