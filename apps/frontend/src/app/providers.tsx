"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/*
        ThemeProvider from next-themes:
        - attribute="class" → adds/removes "dark" class on <html>
        - defaultTheme="system" → follows OS preference by default
        - enableSystem → respects prefers-color-scheme
        Our Tailwind 4 @custom-variant dark applies styles when .dark is on any ancestor
      */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
