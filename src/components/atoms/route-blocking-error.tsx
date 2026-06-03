import { Button } from "~/components/atoms/button"

interface RouteBlockingErrorProps {
  title: string
  description: string
  onRetry: () => void | Promise<void>
  isRetrying?: boolean
}

const RouteBlockingError: React.FC<RouteBlockingErrorProps> = ({
  title,
  description,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="flex min-h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <Button type="button" onClick={() => void onRetry()} disabled={isRetrying}>
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RouteBlockingError
