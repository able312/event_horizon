import { PrintHeader } from "./EventOverviewHeader"
import { useEvent } from "~/hooks/useEvent"
import { SectionBox } from "./SectionBox"
import { TournamentDetails } from "./sections/TournamentDetails"
import { CartDetails } from "./sections/CartDetails"
import { FoodDetails } from "./sections/FoodDetails"
import { BeverageDetails } from "./sections/BeverageDetails"
import { SetupInstructionDetails } from "./sections/SetupInstructionDetails"
import { VendorDetails } from "./sections/VendorDetails"
import { NoteDetails } from "./sections/NoteDetails"

export function EventOverviewPreview() {
  const { data: event } = useEvent()
    
  if (!event) return (<p>No event data found.</p>)
  
    return (
    <div className="grid gap-4 h-content">
        {/* Left Column */}
        <PrintHeader event={ event } />

        {/* Tournament Types */}
        {event.type === "tournament" && (<>
            <SectionBox title="Tournament Details">
                <TournamentDetails />
            </SectionBox>

            <SectionBox title="Cart Details">
                <CartDetails />
            </SectionBox>
        </>)}

        {/* Food */}
        <SectionBox title="Food">
            <FoodDetails />
        </SectionBox>

        {/* Beverage */}
            <SectionBox title="Beverage">
            <BeverageDetails />
        </SectionBox>

        <SectionBox title="Setup Instructions">
            <SetupInstructionDetails />
        </SectionBox>

        <SectionBox title="Vendor Details">
            <VendorDetails />
        </SectionBox>
        
        <SectionBox title="Notes">
            <NoteDetails />
        </SectionBox>
    
    </div>
  )
}