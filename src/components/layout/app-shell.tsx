"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <div className="flex min-h-screen bg-[var(--pf-bg)] text-[var(--pf-body)] antialiased selection:bg-[var(--pf-cyan)]/30">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="ml-16 min-h-[calc(100vh-4rem)] flex-1">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
