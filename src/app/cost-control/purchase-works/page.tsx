'use client'

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function PurchaseWorksPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Redirect to the first project's purchase works
  useEffect(() => {
    const redirectToProjectPurchaseWorks = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, redirect to login
          router.push('/login?returnUrl=/cost-control/purchase-works');
          return;
        }
        
        // Find the first project to redirect to
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        if (projects && projects.length > 0) {
          // Redirect to the project's purchase works page
          router.push(`/projects/${projects[0].id}/cost-control/purchase-works`);
        }
      } catch (error) {
        console.error('Error redirecting to project purchase works:', error);
      }
    };
    
    redirectToProjectPurchaseWorks();
  }, [router, supabase]);
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            Redirecting to Project Purchase Orders
          </CardTitle>
          <CardDescription>
            Purchase orders are managed at the project level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            You'll be automatically redirected to a project's purchase orders page.
            If you're not redirected, please select a project manually.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push('/projects')} className="flex items-center">
            Go to Projects <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 