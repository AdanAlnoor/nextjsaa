'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/components/auth-provider';
import { useState, useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';

export function UserNav() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  // Check if user has admin role
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_role_assignments')
          .select(`
            user_roles!inner(name)
          `)
          .eq('user_id', user.id)
          .eq('user_roles.name', 'admin')
          .limit(1);

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data && data.length > 0);
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, supabase]);

  const handleSignOut = async () => {
    await signOut();
  };
  
  if (loading) {
    return <div className="animate-pulse h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>;
  }

  if (!user) {
    return (
        <Button variant="outline" size="sm" onClick={() => router.push('/login')}>Login</Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
                src={user.user_metadata?.avatar_url || undefined} 
                alt={user.user_metadata?.full_name || user.email || 'User Avatar'} 
            />
            <AvatarFallback>{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => router.push('/settings')}>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Support
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/admin/catalog')}>
                Admin Panel
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 