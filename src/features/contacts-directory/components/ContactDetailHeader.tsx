import { Archive, ArchiveRestore, Copy, Mail, MoreVertical, Pencil, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import type { Contact } from "~/definitions/contacts"
import { buildGmailComposeUrl, buildGmailSearchUrl } from "~/lib/gmailUrlConstructors"
import { openExternalUrl } from "~/lib/ipc/system"

import { formatDirectoryContactPlainText } from "../lib/directoryContactForm"

async function openInGmail(url: () => string) {
  try {
    await openExternalUrl(url())
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to open Gmail")
  }
}

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error("Failed to copy to clipboard")
  }
}

type ContactDetailHeaderProps = {
  contact: Contact
  onEdit: () => void
  onArchive: () => void
  onRestore: () => void
  onRequestDelete: () => void
  isArchiving: boolean
  isRestoring: boolean
}

/** Actions only — the contact's name/avatar live in the body as ContactProfileSummary. */
export const ContactDetailHeader: React.FC<ContactDetailHeaderProps> = ({
  contact,
  onEdit,
  onArchive,
  onRestore,
  onRequestDelete,
  isArchiving,
  isRestoring,
}) => {
  const email = contact.email

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-orange-500"
        aria-label={`Email ${contact.displayName}`}
        title={email ?? "No email on file"}
        disabled={!email}
        onClick={() => void openInGmail(() => buildGmailComposeUrl(email!, `Attn: ${contact.displayName}`))}
      >
        <Mail className="size-4" />
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={onEdit}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-orange-500"
            aria-label={`Actions for ${contact.displayName}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => void copyToClipboard(formatDirectoryContactPlainText(contact), "Contact details copied")}
          >
            <Copy className="size-4" /> Copy details
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!email} onClick={() => void openInGmail(() => buildGmailSearchUrl(email!))}>
            <Search className="size-4" /> Search Gmail
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {contact.archivedAt ? (
            <DropdownMenuItem disabled={isRestoring} onClick={onRestore}>
              <ArchiveRestore className="size-4" /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={isArchiving} onClick={onArchive}>
              <Archive className="size-4" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={onRequestDelete}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
