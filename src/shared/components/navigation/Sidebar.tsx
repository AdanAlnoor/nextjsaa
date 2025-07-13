'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { cn } from '@/shared/utils/cn'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-background border-r h-screen fixed">
      <div className="p-4">
        <h2 className="text-xl font-bold">Next Level UI</h2>
      </div>
      <nav className="space-y-1 p-2">
        {routes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              pathname === route.path 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted"
            )}
          >
            {route.icon && <route.icon className="w-5 h-5" />}
            <span>{route.title}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
} 