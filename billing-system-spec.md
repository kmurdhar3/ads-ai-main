# Billing System (Dodo Payments) — Implementation Spec

## Why this comes before the admin panel
The admin panel spec originally had `plan_type`/`subscription_status` as
admin-editable labels. That's backwards — those fields should be *set by*
a real payment event, with the admin panel just displaying them. This spec
builds that properly; the admin panel (already spec'd separately) becomes
a thinner read-mostly layer once this exists.

This also absorbs the `usage_events` table from the admin spec — it's
needed here too (to enforce credit limits), so it's built once, in this
spec, as shared foundation. If you build the admin panel spec's Phase 1/2
separately, skip those parts — this spec supersedes them.

## Assumption — confirm before building
Proposing a structure modeled on ReviewsToWebsite's existing setup:
- **Trial:** free, limited to N credits (suggest 3 — roughly one full
  pipeline run: 1 brand scrape + 1 competitor search + 1 analysis + 1-2
  concepts), no time limit on the trial itself, just a credit cap
- **Starter:** e.g. $29/mo — X credits/month
- **Pro:** e.g. $79/mo — Y credits/month, or unlimited with fair-use cap
- Given this app's actual cost driver is Claude + Kie.ai + Apify calls
  (not flat infra cost), credits map naturally to the `usage_events` you'd
  already be logging — 1 credit ≈ 1 concept generation, roughly

Adjust pricing/tiers to your judgment — the technical structure below
works the same regardless of the exact numbers.

---

## Phase 1 — Schema

```sql
-- Extends the profiles table (create it if it doesn't exist yet —
-- see the admin-panel spec Phase 1 for the base table + signup trigger)
ALTER TABLE profiles ADD COLUMN dodo_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'trial'
  CHECK (plan_type IN ('trial', 'starter', 'pro'));
ALTER TABLE profiles ADD COLUMN subscription_status TEXT;
  -- NULL (trial) | 'active' | 'past_due' | 'cancelled'
ALTER TABLE profiles ADD COLUMN subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN current_period_end TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN credits_remaining INTEGER NOT NULL DEFAULT 3;
ALTER TABLE profiles ADD COLUMN credits_reset_at TIMESTAMPTZ;

-- Usage log (same table the admin panel spec references — build here,
-- reference there)
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_context_id UUID REFERENCES brand_contexts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  credits_charged INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_user_created ON usage_events(user_id, created_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);

-- Payment event log — raw record of every webhook received, for
-- debugging/reconciliation (mirrors what you'd want when the
-- DODO_WEBHOOK_SECRET case-sensitivity bug from ReviewsToWebsite bites
-- you again — you'll want to see exactly what Dodo sent)
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,        -- raw Dodo event type
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Phase 2 — Dodo product setup

In the Dodo dashboard, create products mirroring ReviewsToWebsite's
pattern (Pro Monthly / Pro Yearly, etc.) — for this app:
- Starter Monthly / Starter Yearly
- Pro Monthly / Pro Yearly

Record each `product_id` — needed in Phase 3's checkout call.

---

## Phase 3 — Checkout flow

```ts
// app/api/billing/checkout/route.ts
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();

  const checkout = await dodoClient.checkoutSessions.create({
    product_id: productId,
    customer: { email: user.email },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
    metadata: { userId: user.id },  // critical — this is how the webhook
                                     // maps the payment back to your user
  });

  return NextResponse.json({ checkoutUrl: checkout.url });
}
```

Frontend: "Upgrade" button (in the sidebar or a dedicated `/billing` page)
calls this, redirects the browser to `checkoutUrl`.

---

## Phase 4 — Webhook handler

This is the piece that actually sets `plan_type`/`subscription_status` —
everything upstream just gets the user to Dodo's checkout; this is where
the state becomes real.

```ts
// app/api/webhooks/dodo/route.ts
import { Webhook } from "svix";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const wh = new Webhook(process.env.DODO_WEBHOOK_SECRET!);
  let event;
  try {
    event = wh.verify(payload, headers);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createRouteClient();

  // Always log the raw event first, before any processing — if something
  // downstream fails, you still have the record to replay/debug
  await supabase.from("billing_events").insert({
    event_type: event.type,
    raw_payload: event,
    user_id: event.data?.metadata?.userId ?? null,
  });

  switch (event.type) {
    case "subscription.active": {
      const userId = event.data.metadata.userId;
      await supabase.from("profiles").update({
        dodo_customer_id: event.data.customer_id,
        subscription_id: event.data.subscription_id,
        plan_type: mapProductIdToPlan(event.data.product_id), // 'starter' | 'pro'
        subscription_status: "active",
        current_period_end: event.data.current_period_end,
        credits_remaining: PLAN_CREDITS[mapProductIdToPlan(event.data.product_id)],
        credits_reset_at: event.data.current_period_end,
      }).eq("id", userId);
      break;
    }
    case "subscription.cancelled": {
      const userId = event.data.metadata.userId;
      await supabase.from("profiles").update({
        subscription_status: "cancelled",
      }).eq("id", userId);
      break;
    }
    case "subscription.renewed": {
      const userId = event.data.metadata.userId;
      const plan = event.data.product_id ? mapProductIdToPlan(event.data.product_id) : null;
      await supabase.from("profiles").update({
        credits_remaining: plan ? PLAN_CREDITS[plan] : undefined,
        credits_reset_at: event.data.current_period_end,
        current_period_end: event.data.current_period_end,
      }).eq("id", userId);
      break;
    }
    // handle 'payment.failed' → subscription_status: 'past_due', etc.
  }

  await supabase.from("billing_events")
    .update({ processed: true })
    .eq("event_type", event.type); // scope this to the specific row inserted above, not by type

  return NextResponse.json({ received: true });
}
```

**Learned from ReviewsToWebsite already:** double-check `DODO_WEBHOOK_SECRET`
for case-sensitive mismatches in your `.env` — this exact bug already cost
you debugging time once on that project.

---

## Phase 5 — Credit enforcement

Add to `lib/usage-tracker.ts` (or wherever the expensive-call logic lives):

```ts
export async function checkAndDeductCredit(
  userId: string,
  cost: number = 1
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createRouteClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .single();

  if (!profile || profile.credits_remaining < cost) {
    return { allowed: false, remaining: profile?.credits_remaining ?? 0 };
  }

  await supabase
    .from("profiles")
    .update({ credits_remaining: profile.credits_remaining - cost })
    .eq("id", userId);

  return { allowed: true, remaining: profile.credits_remaining - cost };
}
```

Call this at the top of the expensive routes (`/api/create` before
generating each concept, `/api/competitors`, `/api/analysis`) — if
`allowed` is false, return a 402-style response the frontend turns into
an "Upgrade to continue" prompt instead of a generic error.

---

## Phase 6 — UI

- `/billing` page: current plan, credits remaining / resets on [date],
  upgrade buttons per tier
- Sidebar: small credits indicator ("2 credits left") — visible reminder
  before someone hits a wall mid-workflow
- "Upgrade to continue" modal/redirect when `checkAndDeductCredit` returns
  `allowed: false`

---

## What the admin panel spec needs to change, now that this exists
- Drop the manual `PATCH /api/admin/users/[id]` plan-editing — plan/status
  now come from `billing_events`/webhooks, not admin hand-editing
  (keep a "grant bonus credits" admin action instead — that's still a
  legitimate manual override, distinct from faking a subscription state)
- Admin user list can now show real `subscription_status`, real
  `current_period_end`, real credit balance — no caveats needed, this
  data is authoritative once this spec is live

---

## Suggested build order
1. Phase 1 (schema) — includes `usage_events`, so this single migration
   covers both billing and the eventual admin panel's data needs.
2. Phase 2 (Dodo product setup) — dashboard work, no code.
3. Phase 3 (checkout) — test that clicking "Upgrade" actually reaches
   Dodo's hosted checkout page.
4. Phase 4 (webhook) — test with Dodo's webhook test/replay tool before
   trusting it against a real payment; verify `billing_events` rows land
   correctly first, then verify `profiles` actually updates.
5. Phase 5 (enforcement) — only after Phase 4 is confirmed reliable;
   enforcing credits against a webhook pipeline you haven't verified yet
   risks locking out paying users on a bug.
6. Phase 6 (UI) — last.
7. Revisit the admin panel spec once this is live — it gets simpler, not
   more complex, per the note above.
