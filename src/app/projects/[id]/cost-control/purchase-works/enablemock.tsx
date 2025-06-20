'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'

export default function PurchaseWorksMock() {
  const router = useRouter()
  const supabase = createClient()
  
  // Enable mock mode in the component upon load
  useEffect(() => {
    const enableMockMode = async () => {
      // Store a flag in localStorage to enable mock mode
      localStorage.setItem('purchase_works_mock_mode', 'true')
      
      // Navigate to the actual purchase works page
      router.refresh()
      
      // Redirect back to the regular page
      setTimeout(() => {
        router.push(`${window.location.pathname.replace('/enablemock', '')}`)
      }, 500)
    }
    
    enableMockMode()
  }, [router])
  
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Enabling Mock Mode</CardTitle>
          <CardDescription>
            Enabling mock data to show the Purchase Works interface...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This will display sample purchase orders for demonstration.</p>
          <div className="flex justify-end">
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 