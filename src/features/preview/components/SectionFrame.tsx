export function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-2 border border-stone-300">
      <h2 className="bg-stone-100 px-2 py-1.5 text-sm font-semibold tracking-wide text-stone-800">
        {title}
      </h2>
    </div>
  )
}

/**
 * Grey title bar with top/left/right border — used as the first piece of a
 * multi-block section, and as continuation headings on later pages.
 */
export function SectionFrameHeading({ title }: { title: string }) {
  return (
    <div className="border border-b-0 border-stone-300">
      <h2 className="bg-stone-100 px-2 py-1.5 text-sm font-semibold tracking-wide text-stone-800">
        {title}
      </h2>
    </div>
  )
}

/**
 * Bordered body cell for one item inside a multi-block section.
 * Bottom border only when `isLast` so adjacent items share a continuous frame.
 */
export function SectionFrameItem({
  children,
  isLast = false,
}: {
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div
      className={
        isLast
          ? "mb-4 border border-stone-300 p-2"
          : "border border-b-0 border-stone-300 p-2"
      }
    >
      {children}
    </div>
  )
}

export function SectionFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 border border-stone-300">
      <h2 className="bg-stone-100 px-2 py-1.5 text-sm font-semibold tracking-wide text-stone-800">
        {title}
      </h2>
      <div className="space-y-4 p-2">{children}</div>
    </div>
  )
}
