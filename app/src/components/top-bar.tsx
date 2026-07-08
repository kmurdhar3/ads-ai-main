"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/create": "Create Ads",
  "/competitors": "Competitor Ads",
  "/knowledge": "Knowledge Base",
  "/tips": "Beginner Tips",
  "/sources": "Sources",
  "/run": "Run Pipeline",
};

export function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Smart Ad Creator";
  const { user, signOut } = useAuth();

  return (
    <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-6 backdrop-blur-xl">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
      <div className="h-4 w-px bg-white/10" />
      <span className="text-sm font-medium">{title}</span>
      
      {/* User Menu - Right Side */}
      {user && (
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
