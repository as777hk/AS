"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthCookieSync } from "@/components/auth-cookie-sync";
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}><><AuthCookieSync/>{children}<Toaster position="top-right" richColors closeButton /></></ThemeProvider>;
}
