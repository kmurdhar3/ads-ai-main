# Homepage (Landing Page) — Full Content Spec

Supersedes Phase 3 of the original marketing-site-spec.md — that version
was a thin draft; this matches the depth/structure of the how-it-works
page you already have built (numbered sub-points, icon + card treatment,
real specifics instead of generic SaaS copy).

Also: fix while building this — the nav's "Go to Dashboard" button is
showing even in a logged-out (Incognito) session per your screenshot. It
should conditionally render "Log in" + "Get Started" when there's no
session, "Go to Dashboard" only when there is one. Check whatever
auth-state check `components/marketing/nav.tsx` is using — likely reading
stale/undefined state instead of properly checking `auth-context`.

---

## Section 1 — Hero

```
[Badge: "Powered by Claude + Meta Ad Library"]

Stop guessing what ad will work.
Start with what's already proven.

AdLaunch AI finds the Facebook & Instagram ads your competitors are
already spending money on — the ones running 30+ days, which means
they're working — and generates new ad concepts for your brand using
the same proven hooks and strategies.

[Get Started Free →]   [See How It Works]

(no credit card required — 3 free credits to try the full pipeline)
```

---

## Section 2 — The insight (contrast section)

Short, sets up why this exists — matches the "reverse-engineering" framing
from your own product notes:

```
Most ad creative is a guess.

You write copy, design an image, launch it, and wait two weeks to find
out if it works. Meanwhile, your competitors have already run hundreds
of ad variations — and the ones still running after 30 days are the
ones that survived. That's not a guess. That's proof.

AdLaunch AI reverse-engineers what's already working, then builds new
ads for your products using the same winning patterns — hooks, angles,
visual style, and structure.
```

---

## Section 3 — 4-step pipeline (condensed, links to full /how-it-works)

Same 4 steps, same icons as `app-sidebar.tsx` / the how-it-works page —
visual consistency matters here since a user will recognize these icons
again the moment they sign up:

```
01  Brand Context      [Building2 icon]
    We learn your brand from your website, Instagram, and YouTube

02  Find Competitors   [Search icon]
    We search the Meta Ad Library for advertisers actually spending
    money in your niche

03  What's Working      [TrendingUp icon]
    Claude AI extracts the exact hooks, angles, and psychology behind
    their best-performing ads

04  Create Ads          [Sparkles icon]
    Get new ad copy + AI-generated images built on those proven
    strategies, sized to match your reference ad exactly

[See the full walkthrough →]  (links to /how-it-works)
```

---

## Section 4 — Feature deep-dive (card grid, matches how-it-works visual style)

This is where the how-it-works-style "card with icon + numbered detail"
treatment earns its place on the homepage too — these are the actual
differentiators, confirmed from the codebase, not invented:

**Quality control, built in**
Every generated concept is scored before you ever see it — brand
consistency, copy quality, and strategic relevance. Only concepts that
clear the bar make it to your screen. No sifting through weak drafts.

**Sized exactly right**
Generated images automatically match your reference ad's exact
dimensions — Story, Feed, or Square — so what you get is ready to run,
not something you have to crop and rework.

**Built for agencies**
Manage multiple client brands from one account. Each brand's
competitors, analysis, and generated concepts stay fully isolated —
switch between clients from a single dropdown.

**Deep hook analysis**
Not just "what's the headline" — we extract the exact hook technique,
the visual approach, and the psychology behind why an ad works, so the
strategy transfers, not just the surface copy.

---

## Section 5 — Who it's for

Pulled directly from your own stated ICP — keep this section honest
about who it's *not* for too, that builds trust rather than undermining
conversion:

```
Built for:
— DTC brand owners and Shopify sellers who need ad creative but don't
  have a design team
— Marketing agencies managing multiple client accounts
— Solo marketing consultants who need to produce concepts fast
— Growth marketers at startups without a big creative team

Not a fit if:
— You don't have an existing brand/product yet (we need something to
  scrape and learn from)
— You're running TV, print, or billboard — this is Meta-specific
— You need a fully hands-off, zero-API-cost tool (this uses real AI
  generation under the hood, so usage has real cost — that's why credits
  exist)
```

That last "not a fit" point is worth keeping — it pre-answers the
"why do I need credits" objection before someone hits the paywall
mid-trial and feels surprised by it.

---

## Section 6 — Pricing teaser

Short snapshot, not the full comparison (that's `/pricing`):

```
Simple, credit-based pricing

[Trial]     [Starter]     [Pro]
Free         $X/mo         $Y/mo
3 credits    N credits     M credits

[See full pricing →]
```

---

## Section 7 — FAQ (addresses real trust questions before signup)

```
Do I need my own API keys?
No — usage is included in your plan via credits. [If you're keeping the
BYOK option from the earlier trial-cost conversation, mention it here
too: "Power users can optionally connect their own API keys for
unlimited usage."]

Is my brand data private from other users?
Yes — every brand is fully isolated with row-level security. Nothing you
scrape or generate is visible to other accounts, including other brands
within an agency account.

What's a "credit"?
Roughly one generated ad concept. Brand setup and competitor research
are included; concept + image generation use credits.

Can I cancel anytime?
[Depends on your actual Dodo subscription terms — fill in once billing
is live]
```

---

## Section 8 — Final CTA

```
Stop guessing. Start with proof.

[Get Started Free →]
```

---

## Implementation notes
- Reuse the icon set already imported in `app-sidebar.tsx`
  (`Building2, Search, TrendingUp, Sparkles`) for Section 3 — don't
  introduce a second icon set for the same 4 steps.
- Section 4's card styling should visually match the numbered-list cards
  from `/how-it-works` (rounded border, subtle background, icon in a
  colored square) — same component if one already exists there, don't
  rebuild it.
- Keep Section 5's "Not a fit if" list — cutting it for being "negative"
  is a common instinct but it's doing real work pre-qualifying visitors.
- Section 7's FAQ answers on BYOK/cancellation depend on decisions from
  the billing spec — leave those two as placeholders until that's locked.
