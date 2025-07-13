"use client"

import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/components/auth-provider"
import { useRouter } from "next/navigation"

export function Header() {
  const { user, isAuthenticated, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-foreground">
            Project Manager
          </Link>
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-4">
              <Link 
                href="/projects" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Projects
              </Link>
              <Link 
                href="/dashboard" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm">
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}