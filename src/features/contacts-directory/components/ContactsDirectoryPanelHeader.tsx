import { UserPlus } from "lucide-react"

import { Button } from "~/components/atoms/button"

type ContactsDirectoryPanelHeaderProps = {
  onStartCreate: () => void
}

const ContactsDirectoryPanelHeader: React.FC<ContactsDirectoryPanelHeaderProps> = ({ onStartCreate }) => (
  <div className="flex w-full items-center justify-end">
    <Button
      variant="ghost"
      size="icon"
      onClick={onStartCreate}
      className="text-orange-500 transition-colors"
      aria-label="New contact"
    >
      <UserPlus className="h-6 w-6" />
    </Button>
  </div>
)

export default ContactsDirectoryPanelHeader
