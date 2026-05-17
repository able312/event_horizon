import { Button } from "~/components/ui/button"
import { X } from 'lucide-react'
import { useHotkey } from "~/lib/hotKeys"


interface ClosePanelHeaderProps {
    onPanelClose: () => void
}
const ClosePanelHeader: React.FC<ClosePanelHeaderProps> = ({ onPanelClose }) => {

    useHotkey("escape", onPanelClose)
    
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onPanelClose}
            className="text-stone-100 transition-colors hover:text-white text-orange-500"
            aria-label="Back to sidebar"
        >
            <X className="h-6 w-6" />
        </Button>
    )
}

export default ClosePanelHeader