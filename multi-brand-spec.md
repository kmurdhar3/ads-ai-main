# Multi-Brand Support — Implementation Spec

## Context
Currently one Supabase user = one brand. The `brand_contexts` table and all
child tables (`products`, `search_results`, `meta_ads`, `analysis_results`,
`concepts`) already have both `user_id` AND `brand_context_id` columns with
no unique constraint forcing one brand per user — the schema already
supports multiple brands per user. This is purely an app-layer gap:
`getBrandContext(userId)` fetches a single row instead of a list, and no
UI exists to switch between brands.

Goal: let a user create and switch between multiple brands (e.g. an agency
managing several clients), with each brand's competitors/analysis/concepts
fully isolated.

**No schema migration is required for the core feature.** RLS policies
already scope every table to `auth.uid() = user_id`, which remains correct
regardless of how many brands a user has.

---

## Phase 1 — Data layer

### 1a. New: list brands for a user
Add to `lib/db/brand-context.ts`:

```ts
export async function listBrandContexts(userId: string) {
  // SELECT id, name, url, updated_at FROM brand_contexts
  // WHERE user_id = userId ORDER BY updated_at DESC
}
```

Uses the existing `idx_brand_contexts_user_id` / `idx_brand_contexts_updated_at`
indexes — no new index needed.

### 1b. Change signature: fetch a specific brand
`getBrandContext(userId)` → `getBrandContext(userId, brandContextId)`.
Add `.eq("id", brandContextId)` to the existing `.eq("user_id", userId)`
query. Do NOT drop the `user_id` filter — keep it as defense-in-depth
alongside RLS.

### 1c. Same change across every other db file
In `lib/db/products.ts`, `lib/db/meta-ads.ts`, `lib/db/concepts.ts`
(and wherever `search_results` / `analysis_results` are queried):
every function currently taking `(userId)` needs to also take
`(userId, brandContextId)` and filter `.eq("brand_context_id", brandContextId)`.
Grep for `.eq("user_id"` across `lib/db/` to find every call site —
there should be one query per file needing this added.

### 1d. New brand creation
Creating a brand context should no longer be an implicit
"upsert the user's one brand" — it should always INSERT a new row.
`app/api/brand/route.ts` POST handler: remove any logic that assumes
"update existing brand for this user"; every POST creates a new
`brand_contexts` row and returns its `id`.

---

## Phase 2 — API routes

All of these currently resolve "the brand" implicitly from `userId` alone.
Each needs to accept a `brandId` and pass it through to the Phase 1 functions.

| Route | Change |
|---|---|
| `app/api/brand/route.ts` GET | Accept `?brandId=` query param. If omitted, fall back to most-recently-updated brand (keeps old links/bookmarks working). |
| `app/api/brand/route.ts` POST | Always creates a new brand row (see 1d), returns `{ brandId }`. |
| `app/api/competitors/route.ts` | Require `brandId` in request body/query — reject with 400 if missing once frontend is updated. |
| `app/api/analysis/route.ts` | Same. |
| `app/api/create/route.ts` | Same — this is the file with the duplicate-import bug fixed earlier; double check that fix is still in place while you're in here. |
| New: `app/api/brands/route.ts` GET | Returns `listBrandContexts(userId)` — the list for the sidebar switcher. |

Every route handler already calls `getAuthenticatedUser()` — keep that
unchanged, just add `brandId` extraction alongside it.

---

## Phase 3 — Client state (which brand is "active")

Add a `BrandProvider` context (parallel to the existing `auth-context.tsx`
pattern) that:
- Holds `activeBrandId` and the list of brands (from `GET /api/brands`)
- Persists `activeBrandId` to `localStorage` (per-browser convenience,
  NOT auth — don't rely on it for security, RLS + server-side checks are
  the real boundary)
- Exposes `switchBrand(brandId)` and `createBrand()` 
- Wrap this around the existing step pages (`/brand`, `/competitors`,
  `/analysis`, `/create`) at the layout level, same place `AuthProvider`
  is currently wrapped.

Every `fetch("/api/...")` call in `app/brand/page.tsx`,
`app/competitors/page.tsx`, `app/analysis/page.tsx`, `app/create/page.tsx`
needs `brandId` added to its query params / POST body, read from this
context.

---

## Phase 4 — UI

### 4a. Brand switcher
Add to `components/app-sidebar.tsx`, above the existing step items:
- Dropdown showing current brand name
- List of other brands (from context)
- "+ New Brand" option → clears `activeBrandId`, routes to `/brand`
  empty-state form, which on submit creates a new brand and sets it active

### 4b. Empty states
`app/brand/page.tsx`'s existing "no brand" welcome screen logic
(`if (!hasBrand)`) needs to become "no *active* brand" — i.e. still show
correctly for a brand-new user, but also correctly when a user has other
brands but hasn't picked one yet / just clicked "+ New Brand".

---

## Explicitly out of scope for this pass
- Team/multi-seat sharing of a single brand between multiple logins
  (different problem — this spec is one user, many brands)
- Renaming/deleting brands (add later, straightforward once the above exists)
- Any schema migration — none needed

---

## Suggested build order
1. Phase 1 (data layer) — testable via direct function calls / a script,
   no UI needed yet.
2. Phase 2 (API routes) — testable via curl/Postman before touching UI.
3. Phase 3 (client context) — wire up without UI changes first, verify
   existing pages still work with a hardcoded/first-brand default.
4. Phase 4 (UI) — switcher + empty states last, once the plumbing is
   proven to work.

Run `npm run build --prefix app` after each phase to catch TypeScript
signature mismatches early — every function signature change in Phase 1
will surface as a build error everywhere it's called, which is actually
the fastest way to find every call site that needs updating.
