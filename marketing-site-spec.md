# Marketing Site + Account Page — Implementation Spec

## Current state
`app/page.tsx` is a hard `redirect("/create")` — there is no public-facing
page at all. Every visitor, logged in or not, gets dropped straight into
the app shell. `components/layout-content.tsx` already has a simple
pathname check that skips the sidebar for `/login`/`/signup` — this spec
extends that same pattern rather than introducing a new one.

## Scope
1. `/` — real marketing homepage (public, no sidebar)
2. `/pricing` — plan comparison, ties directly into the billing spec's tiers
3. `/how-it-works` — explains the 4-step pipeline for a visitor who hasn't signed up yet
4. `/account` — logged-in profile page (email, plan, credits, sign out) — this is the "profile info" piece, distinct from the public pages above

---

## Phase 1 — Routing split

`app/page.tsx` — replace the redirect with auth-aware logic:

```tsx
import { getAuthenticatedUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { MarketingHome } from "@/components/marketing/home";

export default async function RootPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect("/create"); // existing behavior preserved for logged-in users
  return <MarketingHome />;
}
```

`components/layout-content.tsx` — extend the existing exclusion list:

```diff
- const isAuthPage = pathname === "/login" || pathname === "/signup";
+ const publicMarketingPaths = ["/", "/pricing", "/how-it-works", "/login", "/signup"];
+ const isAuthPage = publicMarketingPaths.includes(pathname);
```

(`/account` is intentionally NOT in this list — it's a logged-in page and
should keep the sidebar shell, same as `/brand`, `/create`, etc.)

---

## Phase 2 — Marketing nav + footer

New components, only rendered on the public paths:

```
components/marketing/nav.tsx     — logo, Home / Pricing / How it Works links,
                                    "Log in" + "Get Started" buttons on the
                                    right (or "Go to Dashboard" if a session
                                    exists — check client-side via auth-context)
components/marketing/footer.tsx  — simple: logo, © year, maybe a Knowledge
                                    Base link if you want it discoverable
                                    pre-signup
```

Wrap the three public pages in a small shared layout so nav/footer aren't
duplicated three times:

```
app/(marketing)/layout.tsx   — <MarketingNav /> {children} <MarketingFooter />
app/(marketing)/pricing/page.tsx
app/(marketing)/how-it-works/page.tsx
```

Note: `app/page.tsx` stays where it is (root can't move into a route
group and remain `/`), but it should render the same `<MarketingNav />`/
`<MarketingFooter />` wrapper directly rather than joining the route group,
to keep this simple rather than fighting Next's route-group conventions.

---

## Phase 3 — Homepage content

Grounded in what the product actually does (not generic SaaS filler),
structure:

**Hero**
> Stop guessing what ad will work. Start with what's already proven.
>
> AdLaunch AI finds the Facebook & Instagram ads your competitors are
> already spending money on — the ones that have been running 30+ days,
> which means they're working — and generates new ad concepts for your
> brand using the same proven hooks and strategies.
>
> [Get Started Free] [See How It Works]

**How it works, condensed (4 steps, visual)** — reuse the icons already
in `app-sidebar.tsx` (Building2, Search, TrendingUp, Sparkles) for visual
consistency between marketing and app:
1. **Brand Context** — We learn your brand from your website, Instagram, and YouTube
2. **Find Competitors** — We search the Meta Ad Library for advertisers actually spending in your niche
3. **What's Working** — Claude AI extracts the exact hooks, angles, and patterns behind their best ads
4. **Create Ads** — Get new ad copy + AI-generated images built on those proven strategies for your products

**Why it's different** (pull from what actually makes this product
distinct, confirmed from the codebase):
- Every generated concept is quality-scored before you see it — only the
  ones that pass get shown
- Images match your reference ad's exact aspect ratio (Story, Feed, Square)
- Built for agencies — manage multiple client brands from one account,
  fully isolated

**Social proof / trust section** — skip for now if you have no real
customers/testimonials yet; an empty or fake testimonials section hurts
more than it helps. Revisit once you have real trial users.

**CTA footer** — [Get Started Free] again

---

## Phase 4 — Pricing page

Directly reflects the billing spec's tiers (Trial / Starter / Pro) —
build this *after* the billing spec's Phase 2 (Dodo product setup) is
done, so the `product_id`s exist to wire the buttons to real checkout
sessions (`POST /api/billing/checkout` from that spec).

Structure: 3-column comparison card, credits/month per tier, feature
differences if any (e.g. multi-brand only on Pro, if that's a
tier-gating decision you want to make — not required, just an option).
Each "Choose Plan" button either:
- Not logged in → routes to `/signup?plan=starter` (capture intent,
  redirect into checkout right after signup)
- Logged in → calls the checkout endpoint directly

---

## Phase 5 — How It Works page

Longer-form version of the homepage's condensed 4-step section — one
section per step, with a bit more detail on what happens under the hood
(e.g., "we search the Meta Ad Library across your top keywords in
parallel and score advertisers by how long their ads have been running").
This is good, honest content marketing — it's also genuinely useful as
an onboarding explainer for someone who just signed up and lands on the
empty "Set Up Your Brand" screen from the screenshot you shared earlier.

---

## Phase 6 — Account page (the "profile info" piece)

This is a logged-in page, keeps the sidebar shell (add it to
`app-sidebar.tsx`'s `extraItems`, alongside Knowledge Base).

```
app/account/page.tsx
```

Shows:
- Email (from auth-context)
- Current plan + badge (Trial / Starter / Pro) — from `profiles.plan_type`
- Credits remaining + when they reset — from the billing spec's fields
- "Manage billing" button → if you're on Dodo, this is typically a
  customer portal link Dodo provides, not a page you build yourself —
  check Dodo's docs for a portal/manage-subscription endpoint
- Sign out button (reuse existing `signOut()` from `auth-context.tsx`)

This page depends on the billing spec's schema fields existing
(`plan_type`, `credits_remaining`, `current_period_end`) — sequence
accordingly.

---

## Explicitly out of scope for this pass
- Blog/content marketing beyond the 3 pages above
- SEO metadata beyond the basics already in `app/layout.tsx`
- Testimonials/social proof (revisit once you have real users)
- A/B testing the homepage copy

---

## Suggested build order
1. Phase 1 (routing split) — small, mechanical, do first and verify
   logged-in vs. logged-out both land correctly.
2. Phase 2 (nav/footer shell) — get the public layout working with
   placeholder content before writing real copy.
3. Phase 3 (homepage content) — the copy above is a starting draft, adjust
   freely.
4. Phase 6 (account page) — can happen in parallel with 3/5, only depends
   on Phase 1's routing, not on billing being fully live (just show
   "Trial" / blank credits until the billing spec's schema exists).
5. Phase 4 (pricing) — do this *after* the billing spec's Dodo product
   setup, so the checkout buttons have real product IDs to point at
   rather than placeholders.
6. Phase 5 (how-it-works) — lowest priority, purely additive content.
