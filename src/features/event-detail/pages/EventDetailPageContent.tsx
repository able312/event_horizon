import DetailSections from "~/components/event-detail/detail-sections/DetailSections"

const EventDetailPageContent: React.FC = () => {
  return (
    <div className="w-full mx-auto flex flex-col flex-1 min-h-0 px-4 pt-4 pb-10 overflow-y-auto">
      <DetailSections />
    </div>
  )
}

export default EventDetailPageContent
