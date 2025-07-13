'use client'

import DefaultLayout from './DefaultLayout'

interface FilterLayoutProps {
  children: React.ReactNode;
}

export default function FilterLayout({ children }: FilterLayoutProps) {
  return (
    <DefaultLayout>
      <div className="flex gap-4">
        <div className="w-64 shrink-0">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Filters</h2>
            {/* Filter controls will go here */}
          </div>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </DefaultLayout>
  )
} 