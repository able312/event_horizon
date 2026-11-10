import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { Skeleton } from "~/components/atoms/skeleton"

import { SettingsSection } from "../components/SettingsSection"
import { ProfileNameForm } from "./ProfileNameForm"
import { useCurrentUser } from "./useCurrentUser"

/** Settings → Profile: the user's display name. Email and sign-in belong to their Google account. */
export const ProfileSettings: React.FC = () => {
  const { data: user, isLoading, isError, isFetching, refetch, saveName, isSavingName } = useCurrentUser()

  if (isError) {
    return (
      <RouteBlockingError
        title="Could not load your profile"
        description="Your profile is temporarily unavailable. Please retry."
        onRetry={async () => {
          await refetch()
        }}
        isRetrying={isFetching}
      />
    )
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  // Sign-in stores the account right after it completes, so this is brief
  if (!user) {
    return <p className="text-sm text-muted-foreground">Finishing sign-in. Your profile will appear in a moment.</p>
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Display name">
        {/* Keyed so a save (or a change from another window) restarts the draft from the stored name */}
        <ProfileNameForm
          key={`${user.preferredName ?? ""}|${user.name ?? ""}`}
          user={user}
          isSaving={isSavingName}
          onSave={saveName}
        />
      </SettingsSection>

      <SettingsSection title="Account" description="Your sign-in is managed by your company Google account.">
        <dl className="text-sm">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
          <dd className="mt-1">{user.email}</dd>
        </dl>
      </SettingsSection>
    </div>
  )
}
