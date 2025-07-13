'use client'

import { UserNav } from './UserNav'
import { ThemeToggle } from '@/shared/components/common/theme-toggle'

export function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
} 