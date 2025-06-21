'use client'

import DefaultLayout from './DefaultLayout'
import { QuickActions } from '@/components/dashboard/QuickActions'

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DefaultLayout>
      <div className="space-y-4">
        <QuickActions />
        {children}
      </div>
    </DefaultLayout>
  )
} 