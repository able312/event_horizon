import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'
import { AppRouter } from './app/AppRouter.tsx'
import { AuthProvider } from './features/auth'

const queryClient = new QueryClient({
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
                <AppRouter>
                    <App />
                </AppRouter>
            </AuthProvider>
        </QueryClientProvider>
    </StrictMode>,
)
