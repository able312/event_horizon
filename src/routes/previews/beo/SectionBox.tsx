export const SectionBox = ({title, children}: {title: string, children: React.ReactNode}) => {
  return (
    <div className="border border-1 w-content break-inside-avoid">
        <h2 className="bg-stone-200 p-2">{ title }</h2>

        <div className="p-2 grid grid-cols-1 gap-12">
            { children }
        </div>
    </div>
  )
}