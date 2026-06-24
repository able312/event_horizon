import './App.css'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Toaster } from './components/atoms/sonner'

// Pages
import EventsRoute from '~/routes/Events'

//Hook
import { useIpcNavigation } from './hooks/useIpcNavigation'
import { useGenerateMenuState } from './hooks/useGenerateMenuState'

const EventDetail = lazy(() => import('~/routes/EventDetail'))
const PreviewLayout = lazy(() => import('./components/layouts/PreviewLayout'))
const TimelinePreview = lazy(() => import('./routes/previews/TimelinePreview'))
const EventOverviewPreview = lazy(() =>
  import('./routes/previews/beo/EventOverviewPreview').then((module) => ({
    default: module.EventOverviewPreview,
  })),
)
const FoodOnlyPreview = lazy(() =>
  import('./routes/previews/beo/FoodOnlyPreview').then((module) => ({
    default: module.FoodOnlyPreview,
  })),
)
const FinancialPreview = lazy(() => import('./routes/previews/FinancialPreview'))
const NotFound = lazy(() =>
  import('./routes/NotFound').then((module) => ({
    default: module.NotFound,
  })),
)

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  )
}


function App() {
  useIpcNavigation()
  useGenerateMenuState()

  return (
    <>

      <Routes>
        <Route path="/" element={<EventsRoute />} />
        <Route path="/events" element={<EventsRoute />} />

        <Route
          path="events/:id/:section?"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EventDetail />
            </Suspense>
          }
        />

        <Route
          path="/preview"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PreviewLayout />
            </Suspense>
          }
        >
          <Route
            path="timeline/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <TimelinePreview />
              </Suspense>
            }
          />
          <Route
            path="beo/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <EventOverviewPreview />
              </Suspense>
            }
          />
          <Route
            path="beo-food/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <FoodOnlyPreview />
              </Suspense>
            }
          />
          <Route
            path="financial-report/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <FinancialPreview />
              </Suspense>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
      <Toaster richColors />
    </>
  )
}

export default App
