/** The heading of one of the estimate's pricing sections, "Event Total" or "Per Person". */
export function PricingSectionHeading({
  title,
  description,
  spaced = false,
}: {
  title: string
  description: string
  /** Extra space above, when it follows another section. */
  spaced?: boolean
}) {
  return (
    <div className={spaced ? "mb-2 mt-6" : "mb-2"}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-0.5 text-sm text-stone-600">{description}</p>
    </div>
  )
}
