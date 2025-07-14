'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
// import { Toaster } from 'sonner' // TEMP: Commented out for debugging
import { ThemeProvider } from "@/shared/components/common/theme-provider"
import { AuthProvider } from "@/features/auth/components/auth-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div suppressHydrationWarning>
            {children}
          </div>
          {/* <Toaster position="top-center" /> */}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
} 