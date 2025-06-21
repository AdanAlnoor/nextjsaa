"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InputForm } from "@/components/ui/input/input-form";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<LoginValuesType>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  });

  async function handleLogin(values: LoginValuesType) {
    setIsLoading(true);
    setLoginError(null);
    console.log('Starting login process with email:', values.email);
    
    try {
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
      
      // Store the session ID in multiple places to ensure we keep it
      try {
        window.sessionStorage.setItem('supabase_auth_token', data.session.access_token);
      } catch (e) {
        console.error('Error storing session token in sessionStorage', e);
      }
      
      toast.success("Login successful! Redirecting...");
      
      // We need to avoid a common race condition where the redirect happens before the local storage is set
      setTimeout(() => {
        // Double-check we still have a session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('Session confirmed before redirect, going to projects');
            // Force the browser to reload the page completely to ensure state is fresh
            window.location.href = '/projects';
          } else {
            console.error('Lost session before redirect! Using localStorage fallback');
            // We lost our session, but we can manually restore it
            toast.error("Session issue - please try again");
            setIsLoading(false);
          }
        });
      }, 1000);

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
