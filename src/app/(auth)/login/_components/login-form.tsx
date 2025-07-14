"use client";

import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { InputForm } from "@/shared/components/ui/input/input-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Terminal } from "lucide-react";

export const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type LoginValuesType = z.infer<typeof loginFormSchema>;

const defaultValues: LoginValuesType = {
  email: "",
  password: "",
};

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Get redirect URL from query params using Next.js hook
  const redirectTo = searchParams.get('redirectTo') || '/projects';

  const form = useForm<LoginValuesType>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  });

  async function handleLogin(values: LoginValuesType) {
    setIsLoading(true);
    setLoginError(null);
    console.log('Starting login process with email:', values.email);
    
    try {
      const { createClient } = await import("@/shared/lib/supabase/client");
      const supabase = createClient();
      
      // First check if there's already a session
      console.log('Checking for existing session...');
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log('Already have a session, redirecting to projects');
        router.push('/projects');
        return;
      }
      
      console.log('No existing session, attempting sign in with email/password');
      
      // Clear any problematic localStorage entries before login
      try {
        console.log('Clearing any existing auth localStorage entries');
        window.localStorage.removeItem('sb-refresh-token');
        window.localStorage.removeItem('sb-access-token'); 
        window.localStorage.removeItem('supabase.auth.token');
      } catch (storageError) {
        console.error('Error clearing localStorage:', storageError);
      }
      
      // Now try to sign in
      const { error, data } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (error) {
        console.error('Login error from Supabase:', error);
        throw error;
      }
      
      if (!data.session) {
        console.error('Authentication succeeded but no session was created');
        throw new Error("Authentication succeeded but no session was created.");
      }
      
      console.log('Login successful!', {
        user: data.user?.email,
        session: !!data.session,
        expiresAt: data.session?.expires_at
      });
      
      toast.success("Login successful! Redirecting...");
      
      // We need to avoid a common race condition where the redirect happens before the local storage is set
      setTimeout(() => {
        // Double-check we still have a session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('Session confirmed before redirect, going to:', redirectTo);
            // Use router.push for better Next.js integration
            router.push(redirectTo);
          } else {
            console.error('Lost session before redirect!');
            toast.error("Session issue - please try again");
            setIsLoading(false);
          }
        });
      }, 500);

    } catch (err: any) {
      console.error("Login Process Error:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setLoginError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="space-y-4"
      >
        {loginError && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>
              {loginError}
            </AlertDescription>
          </Alert>
        )}
        <InputForm
          label="Email"
          name="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          required
          disabled={isLoading}
        />
        <InputForm
          type="password"
          label="Password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
