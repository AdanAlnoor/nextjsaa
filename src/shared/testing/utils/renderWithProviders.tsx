import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  wrapper?: ({ children }: { children: ReactNode }) => ReactElement
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    wrapper,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const Component = wrapper || (({ children }) => <>{children}</>)
    
    return (
      <QueryClientProvider client={queryClient}>
        <Component>{children}</Component>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}