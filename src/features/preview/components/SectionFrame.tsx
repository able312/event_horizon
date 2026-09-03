export function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-2 border border-stone-300">
      <h2 className="bg-stone-100 px-2 py-1.5 text-sm font-semibold tracking-wide text-stone-800">
        {title}
      </h2>
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
