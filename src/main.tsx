import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  }
})

const computeBasename = () => {
  try {
    if (window.location.protocol === 'file:') {
      window.history.replaceState({}, '', '/');
    }
  } catch {
    return '/';
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={computeBasename()}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
