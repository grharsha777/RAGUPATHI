"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { initializeTheme } from "@/lib/store/theme-store";

type AppProvidersProps = {
  children: ReactNode;
};

function CustomThemeInit() {
  useEffect(() => {
    initializeTheme();
  }, []);
  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 2,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <CustomThemeInit />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </NextThemesProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
