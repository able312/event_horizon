import type { ReactNode } from "react"

type ContactSectionCardProps = {
  title: string
  action?: ReactNode
  children: ReactNode
}

/** Bordered card with an uppercase label, used to group sections on the contact detail page. */
export const ContactSectionCard: React.FC<ContactSectionCardProps> = ({ title, action, children }) => (
  <section className="space-y-3 rounded-lg border border-border bg-card p-4">
    <div className="flex items-center justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {action}
    </div>
    {children}
  </section>
)
