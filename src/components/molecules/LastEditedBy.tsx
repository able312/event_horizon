import type { AuditFields } from "~/definitions/database"
import { useUsers } from "~/hooks/useUsers"
import { describeLastEdit, formatLastEdit } from "~/lib/audit/lastEdited"
import { cn } from "~/lib/utils"

type LastEditedByProps = {
  record: AuditFields & { updatedAt?: string | null; createdAt?: string }
  className?: string
}

/** "Last edited by X · time"; renders nothing when the editor is unknown or users haven't loaded. */
export const LastEditedBy: React.FC<LastEditedByProps> = ({ record, className }) => {
  const { data: users } = useUsers()
  const lastEdit = users ? describeLastEdit(record, users) : null
  if (!lastEdit) return null
  return <p className={cn("truncate text-xs text-muted-foreground", className)}>{formatLastEdit(lastEdit)}</p>
}
