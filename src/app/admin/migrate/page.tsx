'use client'

import { useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function MigrationPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<string[]>([])

  const checkCatalogueTables = async () => {
    const supabase = createClient()
    
    try {
      // Test if catalogue tables exist
      const { error: materialError } = await supabase
        .from('material_catalogue')
        .select('id')
        .limit(1)
      
      if (materialError && materialError.code === '42P01') {
        // Table doesn't exist
        return { tablesExist: false, hasWorkCategories: false }
      }
      
      // Tables exist, check for work_category columns
      const { error: workCategoryError } = await supabase
        .from('material_catalogue')
        .select('work_category')
        .limit(1)
      
      if (workCategoryError && workCategoryError.code === '42703') {
        // work_category column doesn't exist
        return { tablesExist: true, hasWorkCategories: false }
      }
      
      return { tablesExist: true, hasWorkCategories: true }
    } catch (error) {
      return { tablesExist: false, hasWorkCategories: false }
    }
  }

  const applyMigration = async () => {
    setStatus('checking')
    setMessage('Checking database state...')
    setDetails([])
    
    try {
      const { tablesExist, hasWorkCategories } = await checkCatalogueTables()
      
      if (!tablesExist) {
        setStatus('error')
        setMessage('Catalogue tables do not exist!')
        setDetails([
          '❌ The catalogue tables (material_catalogue, labor_catalogue, equipment_catalogue) are missing',
          '📋 You need to apply the foundation migration first',
          '🔧 Please apply this migration manually via Supabase Dashboard:',
          '📁 File: supabase/migrations/20240628000001_library_foundation.sql',
          '',
          '📖 Instructions:',
          '1. Go to your Supabase project dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy and run the entire contents of the foundation migration file',
          '4. Then return here to apply the work categories migration'
        ])
        return
      }
      
      if (hasWorkCategories) {
        setStatus('success')
        setMessage('All migrations already applied!')
        setDetails([
          '✅ Catalogue tables exist',
          '✅ Work category columns are present',
          '🎉 Your database is ready for catalogue management!'
        ])
        return
      }

      // Only work categories migration needed
      setStatus('migrating')
      setMessage('Applying work categories migration...')
      setDetails(['✅ Catalogue tables exist', '🔄 Adding work category support...'])
      
      const response = await fetch('/api/admin/migrate/work-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setMessage(result.message)
        setDetails([
          '✅ Catalogue tables exist',
          ...result.details.map((detail: string) => `✅ ${detail}`)
        ])
      } else {
        throw new Error(result.error || 'Migration failed')
      }

    } catch (error) {
      setStatus('error')
      setMessage(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setDetails([
        '❌ The migration could not be completed',
        '💡 Try applying the migration manually via Supabase dashboard',
        '📁 Migration files:',
        '   - 20240628000001_library_foundation.sql (foundation)',
        '   - 20240628000004_add_work_categories.sql (work categories)'
      ])
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'checking':
      case 'migrating':
        return <AlertCircle className="h-5 w-5 text-blue-500 animate-pulse" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'checking':
      case 'migrating':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Database Migration: Work Categories</CardTitle>
          <CardDescription>
            Apply the work categories migration to enable construction work categorization
            for materials, labor, and equipment catalogues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What this migration does:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Adds work_category column to material_catalogue</li>
              <li>Adds work_category column to labor_catalogue</li>
              <li>Adds work_category column to equipment_catalogue</li>
              <li>Creates performance indexes for filtering</li>
              <li>Sets default values for existing records</li>
            </ul>
          </div>

          {status !== 'idle' && (
            <Alert className={getStatusColor()}>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <AlertDescription className="flex-1">
                  <div className="font-medium">{message}</div>
                  {details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {details.map((detail, index) => (
                        <div key={index} className="text-sm">{detail}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Button 
            onClick={applyMigration} 
            disabled={status === 'checking' || status === 'migrating'}
            className="w-full"
          >
            {status === 'checking' ? 'Checking...' : 
             status === 'migrating' ? 'Migrating...' : 
             'Apply Migration'}
          </Button>

          {status === 'success' && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/admin/catalog'}
              >
                Go to Catalog Management
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}