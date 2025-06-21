'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()

  // Redirect to the main login page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login')
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">Login Page Notice</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="mb-4">
              This login page is being redirected to the main application login page.
            </p>
            <p className="mb-4">
              You will be redirected automatically in a few seconds.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/login">
              Go to Login Now
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 