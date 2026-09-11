"use client";

import { useEffect, useState } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setTokenGetter } from "@/lib/api/client";

function TokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: 1 },
        },
      }),
  );

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <MissingConfig />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <TokenBridge>{children}</TokenBridge>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">Add Clerk keys to start</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code> and set{" "}
          <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. The API also needs{" "}
          <code>CLERK_SECRET_KEY</code>, <code>DATABASE_URL</code>, and{" "}
          <code>OPENROUTER_API_KEY</code>.
        </p>
      </div>
    </div>
  );
}
