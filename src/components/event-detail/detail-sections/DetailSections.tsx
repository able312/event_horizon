import { useState } from 'react';

// Section components
// import WeatherContingencySection from "~/components/event-detail/detail-sections/sections/WeatherContingencySection"
import VendorsSection from "~/components/event-detail/detail-sections/sections/VendorsSection"
import FoodSection from "~/components/event-detail/detail-sections/sections/FoodSection"
import BeverageSection from "~/components/event-detail/detail-sections/sections/BeverageSection"
// import DocumentsSection from "~/components/event-detail/detail-sections/sections/DocumentsSection"
import PaymentsSection from "~/features/event-detail/sections/financial-workspace/PaymentsSection"
import ExpandableSection from "~/components/atoms/expandable-section"
import SetupInstructionsSection from './sections/SetupInstructionsSection';

import EventTimeline from "~/components/event-detail/detail-sections/sections/timeline/EventTimeline"

import { 
  Utensils,
  // CloudRain,
  // File,
  Wine,
  Store,
  Package,
  CreditCard,
  HandCoins,
  NotebookPen,
  LandPlot,
  Tractor,
} from "lucide-react"

import EventViewToggle from "~/components/event-detail/EventViewToggle"
import { useEvent } from '~/hooks/useEvent';
import GolfCartsSection from './sections/GolfCartsSection';
import TournamentDetailsSection from './sections/TournamentDetailsSection';
import MenuOfChargeSection from '../../../features/event-detail/sections/financial-workspace/MenuOfChargeSection';
import NotesSection from './sections/NotesSection';
import { ErrorBoundary } from 'react-error-boundary';


const DetailSections = () => {

  const [viewMode, setViewMode] = useState<"details" | "timeline">("details")
  const {data: event } = useEvent()

  
  return (
    <div className="col-span-2 space-y-4 pb-6">
          
          {/* View Toggle - Details vs Timeline */}
          <EventViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Show Details View or Timeline View based on toggle */}
          {viewMode === "details" ? (
            <>
              {/* Documents Section - Contracts, agreements, signed forms */}
              {/* <ExpandableSection title="Documents" icon={<File className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <DocumentsSection />
                </ErrorBoundary>
              </ExpandableSection> */}

              {/* Food Section - Menu choices, dietary restrictions */}
              <ExpandableSection title="Food" icon={<Utensils className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <FoodSection />
                </ErrorBoundary>
              </ExpandableSection>

              {/* Beverage Section - Bar packages, drink tickets */}
              <ExpandableSection title="Beverage" icon={<Wine className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <BeverageSection />
                </ErrorBoundary>
              </ExpandableSection>

              {event?.type === "tournament" && 
                <>
                  <ExpandableSection title="Tournament Details" icon={<LandPlot className='h-4 w-4'/>}>
                    <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                      <TournamentDetailsSection />
                    </ErrorBoundary>
                  </ExpandableSection>

                  <ExpandableSection title="Golf Carts" icon={<Tractor className='h-4 w-4'/>}>
                    <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                      <GolfCartsSection />
                    </ErrorBoundary>
                  </ExpandableSection>
                </>
              }

              <ExpandableSection title="Set Up Instructions" icon={<Package className='h-4 w-4'/>}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <SetupInstructionsSection />
                </ErrorBoundary>
              </ExpandableSection>

              <ExpandableSection title="Notes" icon={<NotebookPen className='h-4 w-4'/>}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <NotesSection />
                </ErrorBoundary>
              </ExpandableSection>

              {/* Vendors Section - All event types */}
              <ExpandableSection title="Vendors" icon={<Store className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <VendorsSection />
                </ErrorBoundary>
              </ExpandableSection>

              <ExpandableSection title="Menu of Charge" icon={<HandCoins className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <MenuOfChargeSection />
                </ErrorBoundary>
              </ExpandableSection>
              
              <ExpandableSection title="Payment History" icon={<CreditCard className="h-4 w-4" />}>
                <ErrorBoundary fallback={<p>Something went wrong..</p>}>
                  <PaymentsSection />
                </ErrorBoundary>
              </ExpandableSection>

              {/* Weather Contingency Section - All event types */}
              {/* <ExpandableSection title="Weather Contingency" icon={<CloudRain className="h-4 w-4" />}>
                <WeatherContingencySection />
              </ExpandableSection> */}
            </>
          ) : (
            /* Timeline View - Full timeline when toggle is set to Timeline */
            <EventTimeline />
          )}
        </div>
  );
};

export default DetailSections;
