'use client'

import { ThemeToggle } from "@/shared/components/common/theme-toggle"

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <main className="min-h-screen">{children}</main>
    </>
  );
}
