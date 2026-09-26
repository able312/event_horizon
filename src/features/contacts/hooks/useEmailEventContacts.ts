import { useState } from "react"
import { toast } from "sonner"

import { buildGmailComposeUrl } from "~/lib/gmailUrlConstructors"
import { resolveEventRecipients } from "~/lib/ipc/eventContacts"
import { openExternalUrl } from "~/lib/ipc/system"

import { getContactsErrorMessage } from "../lib/eventContactsPanel"

/**
 * Opens one Gmail draft addressed to the selected contacts.
 * The back end de-duplicates emails and reports contacts that have none.
 */
export function useEmailEventContacts(eventId: string, eventTitle: string) {
  const [isResolving, setIsResolving] = useState(false)

  const emailContacts = async (eventContactIds: string[]) => {
    if (eventContactIds.length === 0) return

    setIsResolving(true)
    try {
      const { recipients, skipped } = await resolveEventRecipients(eventId, { eventContactIds })

      if (skipped.length > 0) {
        const names = skipped.map((contact) => contact.displayName).join(", ")
        toast.warning(`No email on file for ${names}`)
      }
      if (recipients.length === 0) return

      const to = recipients.map((recipient) => recipient.email).join(",")
      await openExternalUrl(buildGmailComposeUrl(to, `Attn: ${eventTitle}`))
    } catch (err) {
      toast.error(getContactsErrorMessage(err, err instanceof Error ? err.message : "Failed to open Gmail"))
    } finally {
      setIsResolving(false)
    }
  }

  return { emailContacts, isResolving }
}
