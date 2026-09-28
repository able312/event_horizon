type InlineFormPanelProps = {
  title: string
  description: string
  footer: React.ReactNode
  onCancel: () => void
  children: React.ReactNode
}

/** Framed form rendered in place inside the Event Team card. Escape cancels, like closing a dialog. */
export const InlineFormPanel: React.FC<InlineFormPanelProps> = ({ title, description, footer, onCancel, children }) => (
  <div
    role="group"
    aria-label={title}
    className="my-2 rounded-xs border border-orange-200 bg-orange-50/30 p-3"
    onKeyDown={(event) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      onCancel()
    }}
  >
    <div className="mb-3">
      <h4 className="text-sm font-semibold tracking-wide">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="space-y-4">{children}</div>
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">{footer}</div>
  </div>
)
