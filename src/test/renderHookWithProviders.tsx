import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, type RenderHookOptions, type RenderHookResult } from "@testing-library/react"
import type { ReactNode } from "react"

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function renderHookWithProviders<Result, Props>(
  callback: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, "wrapper">,
): RenderHookResult<Result, Props> & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const renderResult = renderHook(callback, { wrapper: Wrapper, ...options })
  return { ...renderResult, queryClient }
}
