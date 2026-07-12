"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProfileData {
  plan_type?: string;
  credits_remaining?: number;
  current_period_end?: string;
}

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // TODO: Fetch profile data from Supabase when billing schema exists
    // For now, show placeholder values
    setProfile({
      plan_type: "Trial",
      credits_remaining: 0,
      current_period_end: undefined,
    });
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Account Info Card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="text-base font-medium">{user.email}</p>
          </div>

          {/* Plan */}
          <div>
            <label className="text-sm text-muted-foreground">Current Plan</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary border border-primary/20">
                {profile?.plan_type || "Trial"}
              </span>
            </div>
          </div>

          {/* Credits */}
          <div>
            <label className="text-sm text-muted-foreground">Credits Remaining</label>
            <p className="text-base font-medium">
              {profile?.credits_remaining ?? "—"}
              {profile?.current_period_end && (
                <span className="text-sm text-muted-foreground ml-2">
                  (resets {new Date(profile.current_period_end).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Billing Card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Billing</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your subscription and billing settings.
        </p>
        <Button variant="outline" disabled>
          Manage Billing
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Billing management will be available once the billing system is configured.
        </p>
      </div>

      {/* Actions */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <Button variant="destructive" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
