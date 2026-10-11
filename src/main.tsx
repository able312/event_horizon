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
