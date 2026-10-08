import './App.css'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Toaster } from './components/atoms/sonner'

// Pages
import EventsRoute from '~/routes/Events'

//Hook
import { useIpcNavigation } from './hooks/useIpcNavigation'
import { useGenerateMenuState } from './hooks/useGenerateMenuState'
import { UpdaterProvider } from './features/updater/state/UpdaterProvider'

const EventDetail = lazy(() => import('~/routes/EventDetail'))
const Preview = lazy(() => import('~/routes/Preview'))
const Contacts = lazy(() => import('~/routes/Contacts'))
const Login = lazy(() => import('~/routes/Login'))
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
    <UpdaterProvider>

      <Routes>
        <Route path="/" element={<EventsRoute />} />
        <Route path="/events" element={<EventsRoute />} />

        <Route
          path="/events/:id/timeblock/:timeblockId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EventDetail />
            </Suspense>
          }
        />

        <Route
          path="/events/:id/note/:timeblockId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EventDetail />
            </Suspense>
          }
        />

        <Route
          path="events/:id/:section?"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EventDetail />
            </Suspense>
          }
        />

        <Route
          path="/preview/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Preview />
            </Suspense>
          }
        />

        <Route
          path="/contacts"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Contacts />
            </Suspense>
          }
        />

        <Route
          path="/contacts/:contactId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Contacts />
            </Suspense>
          }
        />

        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Login />
            </Suspense>
          }
        />

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
    </UpdaterProvider>
  )
}

export default App
