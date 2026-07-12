"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages that should not show sidebar/topbar
  const publicMarketingPaths = ["/", "/pricing", "/how-it-works", "/landing", "/login", "/signup"];
  const isAuthPage = publicMarketingPaths.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto min-h-screen">
        <TopBar />
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
