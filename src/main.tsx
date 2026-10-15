import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'
import { AppRouter } from './app/AppRouter.tsx'
import { AuthProvider, SessionGate } from './features/auth'
import { createAppQueryClient } from './lib/data/backend'

const queryClient = createAppQueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
        }
    }
})

// macOS already draws thin overlay scrollbars; everywhere else gets the minimal ones in App.css.
if (!navigator.platform.toUpperCase().includes("MAC")) {
    document.documentElement.classList.add('minimal-scrollbars')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SessionGate>
                    <AppRouter>
                        <App />
                    </AppRouter>
                </SessionGate>
            </AuthProvider>
        </QueryClientProvider>
    </StrictMode>,
)
