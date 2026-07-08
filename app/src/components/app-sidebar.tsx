"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, Search, BookOpen, Building2, CheckCircle, TrendingUp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const stepItems = [
  { title: "Brand Context", href: "/brand", icon: Building2, step: 1 },
  { title: "Find Competitors", href: "/competitors", icon: Search, step: 2 },
  { title: "What's Working", href: "/analysis", icon: TrendingUp, step: 3 },
  { title: "Create Ads", href: "/create", icon: Sparkles, step: 4 },
];

const extraItems = [
  { title: "Knowledge Base", href: "/knowledge", icon: BookOpen },
];

interface StepStatus {
  hasBrand: boolean;
  hasSearch: boolean;
  hasAnalysis: boolean;
  conceptCount: number;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<StepStatus | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [pathname]);

  function isStepComplete(step: number): boolean {
    if (!status) return false;
    if (step === 1) return status.hasBrand;
    if (step === 2) return status.hasSearch;
    if (step === 3) return status.hasAnalysis;
    if (step === 4) return status.conceptCount > 0;
    return false;
  }

  return (
    <Sidebar className="border-r border-white/[0.06]">
      <SidebarHeader className="px-5 py-6">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
      <Image 
        src="/logo_2.png" 
        alt="AdLaunch AI Logo" 
        width={36}
        height={36}
        className="h-full w-full object-cover"
      />
    </div>
    <div>
      <h1 className="text-sm font-semibold tracking-tight">AdLaunch AI</h1>
      <p className="text-[11px] text-muted-foreground">Smart AI Ad Generator</p>
    </div>
  </div>
</SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {stepItems.map((item) => {
                const isActive = pathname === item.href;
                const complete = isStepComplete(item.step);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className="h-10 rounded-xl px-3 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="h-4 w-4" />
                        <span className="text-[13px] flex-1">{item.title}</span>
                        {complete ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.15] text-[10px] text-muted-foreground">
                            {item.step}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-2 my-2 bg-white/[0.06]" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {extraItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className="h-10 rounded-xl px-3 transition-all duration-200"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-5 py-4">
        <p className="text-[11px] text-muted-foreground">
          Powered by Claude + Meta Ad Library
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
