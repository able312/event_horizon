import { cn } from "~/lib/utils"
import { Skeleton } from "./skeleton"
import { glassUI } from '~/styles/GlassStyles'

function ListCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-card"
      className={cn("relative overflow-hidden w-full mx-auto flex flex-col flex-1 min-h-0", className)}
      {...props}
    />
  )
}

function ListHeading({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <div
      data-slot="list-heading"
      className={cn("absolute rounded-full drop-shadow-lg overflow-hidden left-0 right-0 px-4 py-2 text-sm font-md text-muted-foreground text-left grid grid-cols-12 gap-4 z-5", className, glassUI)}
      {...props}
    />
  )
}

function ListContainer({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <div
      data-slot="list-container"
      className={cn("overflow-x-auto w-full pt-12 rounded-lg", className)}
      {...props}
    />
  )
}

function ListItem({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <div
      data-slot="list-heading"
      className={cn("grid grid-cols-12 gap-4 items-center px-4 py-1", className)}
      {...props}
    />
  )
}

const ListSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col gap-4 pt-8">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
    )
}

export { ListCard, ListHeading, ListContainer, ListItem, ListSkeleton }
