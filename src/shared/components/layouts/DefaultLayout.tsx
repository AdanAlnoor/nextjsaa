'use client'

import { Header } from '@/shared/components/navigation/Header'
import { Sidebar } from '@/shared/components/navigation/Sidebar'

interface DefaultLayoutProps {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 