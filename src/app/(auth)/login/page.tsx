import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { ChevronLeftCircle } from "lucide-react";
import Link from "next/link";
import LoginForm from "./_components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata = {
  title: 'Login',
  description: 'Login to your Construction Project Manager account',
};

const LoginPage = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
      <Button variant="ghost" size="sm" asChild className={cn("absolute left-4 top-4 md:left-8 md:top-8")}>
        <Link href="/">
          <ChevronLeftCircle className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <Card className="z-10 w-full max-w-md mx-4">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 px-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
        >
          Register Now
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
