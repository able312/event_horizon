import { Skeleton } from "~/components/atoms/skeleton"
import getGlassUI from "~/styles/GlassStyles"

export const DetailsTitleBarSkeleton: React.FC = () => {
  return (
    <>
      {/* Back button skeleton */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header Container */}
      <div className={`${getGlassUI("white")} px-6 py-5 mb-6`}>
        {/* Title & Tags */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <Skeleton className="h-9 w-64 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>

        {/* Date/Time & Guest Count */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
