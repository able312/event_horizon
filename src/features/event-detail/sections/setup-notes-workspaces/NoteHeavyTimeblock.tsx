import { Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import TimeblockHeader from "~/components/organisms/TimeblockHeader"
import DocumentStyleTextArea from "~/components/molecules/DocumentStyleTextarea"
import type { UpdateTimeblock } from "~/definitions/database"

interface NoteHeavyTimeblockProps {
    timeblockID: string,
    title: string,
    titlePlaceholder: string,
    time: string,
    assignedTo: string,
   
    notes: string,

    sectionTitle: string,
    contentPlaceholder: string,

    updateTimeblock: (payload: {id: string, updates: UpdateTimeblock}) => void,
    deleteTimeblock: () => void
}

const NoteHeavyTimeblock:React.FC<NoteHeavyTimeblockProps> = ({
    timeblockID,
    title,
    titlePlaceholder,
    time,
    assignedTo,

    notes,

    sectionTitle,
    contentPlaceholder,

    updateTimeblock,
    deleteTimeblock,

}) => {
    
    if (!timeblockID) return(
         <div className="rounded-xs border border-dashed border-border bg-red-50 px-4 py-4">
          <p className="text-sm text-muted-foreground">An error occured loading this timeblock.</p>
        </div>
    )

    return (


        <div className="shadow-sm">
            <TimeblockHeader
                timeblockID={ timeblockID }
                time={ time }
                title={ title }
                sectionTitle={ sectionTitle }
                assignedTo={ assignedTo }
                titlePlaceholder={ titlePlaceholder }
                tail={
                    <Button
                        variant="darkSecondary"
                        aria-label="Delete vendor timeblock"
                        className=" rounded-none rounded-tr-xs h-full m-0 hover:bg-stone-600 hover:text-red-600"
                        onClick={ deleteTimeblock }
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                }
                updateTimeblock={ updateTimeblock }
            />
            
            {/* Timeblock Body */}
            

            <div className="border border-stone-300">
                {/* Text Input */}
                <DocumentStyleTextArea
                    className="min-h-[252px]"
                    placeholderText={ contentPlaceholder }
                    content={ notes }
                    updateContentSource={ (content: string) => updateTimeblock({id: timeblockID, updates: { details: content }}) }
                />
            </div>
        </div>
    )
}

export default NoteHeavyTimeblock