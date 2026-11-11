import { useState, type FormEvent } from "react"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import type { CurrentUser } from "~/definitions/database"

import { evaluateNameDraft, initialNameDraft } from "./profileName"

type ProfileNameFormProps = {
  user: CurrentUser
  isSaving: boolean
  onSave: (preferredName: string | null) => void
}

export const ProfileNameForm: React.FC<ProfileNameFormProps> = ({ user, isSaving, onSave }) => {
  const [draft, setDraft] = useState(() => initialNameDraft(user))
  const evaluation = evaluateNameDraft(draft, user)
  const canSave = evaluation.ok && evaluation.changed && !isSaving

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSave && evaluation.ok) onSave(evaluation.preferredName)
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <label htmlFor="profile-name" className="block text-sm font-medium">
        Name
      </label>
      <div className="flex gap-2">
        <Input
          id="profile-name"
          value={draft}
          autoComplete="name"
          aria-invalid={!evaluation.ok || undefined}
          aria-describedby="profile-name-hint"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" disabled={!canSave}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      <p id="profile-name-hint" className={evaluation.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
        {evaluation.ok ? googleNameHint(user.name) : evaluation.error}
      </p>
    </form>
  )
}

function googleNameHint(googleName: string | null): string {
  return googleName
    ? `Shown on records you create or edit. Leave blank to use your Google name (${googleName}).`
    : "Shown on records you create or edit. Leave blank to use your email."
}
