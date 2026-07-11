# Concept History / Versioning — Implementation Spec

## Scope
Two related but separable pieces:
1. **Batch history (core deliverable):** every time a user runs "Create Ads,"
   the resulting concepts are grouped as one batch/run, browsable as a
   timeline instead of one flat, ever-growing grid.
2. **Lightweight versioning (add-on, same schema):** regenerating a specific
   concept creates a new row linked to the original, so you can see what it
   was refined from.

Both piggyback on the same two schema additions below — building (1) without
(2) is a smaller subset of the same work, so do them together.

---

## Phase 0 — Fix while we're in this file
`lib/db/concepts.ts` currently imports `createClient` from
`@/lib/supabase/client` (the **browser** client), but every function here is
only ever called from server-side API routes (`/api/create`, etc.). Swap to
`createRouteClient` from `@/lib/supabase/route` (async — needs `await`)
before adding anything new, since the new batch functions below inherit
whichever client this file uses.

Also confirm `getConcepts` / `saveConcept` already take `(userId, brandContextId)`
per the multi-brand work — if that's landed, the queries here should already
filter on `brand_context_id`. If not, fix that first; batches are meaningless
without correct brand scoping.

---

## Phase 1 — Schema

```sql
-- New table: one row per "Create Ads" run
CREATE TABLE concept_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_names TEXT[],           -- products included in this run
  requested_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0, -- how many cleared QC (6.0+)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_concept_batches_user_id ON concept_batches(user_id);
CREATE INDEX idx_concept_batches_brand_context_id ON concept_batches(brand_context_id);
CREATE INDEX idx_concept_batches_created_at ON concept_batches(user_id, created_at DESC);

ALTER TABLE concept_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concept batches"
  ON concept_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own concept batches"
  ON concept_batches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Extend existing concepts table
ALTER TABLE concepts ADD COLUMN batch_id UUID REFERENCES concept_batches(id) ON DELETE CASCADE;
ALTER TABLE concepts ADD COLUMN parent_concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;
ALTER TABLE concepts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_concepts_batch_id ON concepts(batch_id);
```

**Backward compatibility:** `batch_id` is nullable — every concept that
already exists in the table stays valid, just ungrouped. The UI (Phase 3)
should bucket all `batch_id IS NULL` rows into a single "Earlier concepts"
group at the bottom of the timeline, rather than erroring or hiding them.

---

## Phase 2 — Data layer (`lib/db/concepts.ts`)

```ts
// Create a batch row at the start of a generation run, before the
// parallel concept-generation loop kicks off.
export async function createConceptBatch(
  userId: string,
  brandContextId: string,
  productNames: string[],
  requestedCount: number
): Promise<string> // returns batch id

// Call once after all concepts in the run have been scored/saved.
export async function updateConceptBatchStats(
  batchId: string,
  passedCount: number
): Promise<void>

// List batches for the timeline view, most recent first.
export async function getConceptBatches(
  userId: string,
  brandContextId: string
): Promise<{ id: string; createdAt: string; productNames: string[]; requestedCount: number; passedCount: number }[]>

// Existing getConcepts(userId, brandContextId) needs batch_id,
// parent_concept_id, version added to both the select and the
// row-mapping return object.

// New: fetch concepts for one specific batch (used when a batch is expanded)
export async function getConceptsByBatch(
  userId: string,
  batchId: string
): Promise<AdConcept[]>

// saveConcept(userId, concept) needs an optional batchId and parentConceptId
// param, both passed through to the insert.
```

---

## Phase 3 — API route (`app/api/create/route.ts`)

At the start of a generation request:
1. Call `createConceptBatch()` first, get back `batchId`.
2. Pass `batchId` into every `saveConcept()` call for concepts produced in
   this run.
3. After all concepts in the run are scored/saved, call
   `updateConceptBatchStats(batchId, passedCount)`.

For the "regenerate a single concept" action (versioning piece):
- New or extended endpoint that takes an existing `conceptId`, re-runs
  generation for just that one concept (same product/inspiration-ad
  context), and saves the result with `parentConceptId: conceptId`,
  `version: parent.version + 1`, and the **same** `batchId` as the parent
  (a regenerated concept belongs to the run it came from, not a new batch).

---

## Phase 4 — UI (`app/create/page.tsx`)

- Replace the flat concept grid with a **batch timeline**: most recent
  batch expanded by default (current behavior, unchanged visually), older
  batches collapsed into a header row — e.g. `"Jul 14, 3:45 PM · 3 concepts
  · 2 passed QC"` — that expands on click.
- The "Earlier concepts" bucket (from Phase 1's nullable `batch_id`) sits at
  the bottom, same collapsed-by-default treatment.
- On each concept card, if `parentConceptId` is set, show a small
  `"v2 · regenerated"` badge with a link/toggle to view the original
  version's headline+body inline for comparison.
- Add a "Regenerate" action to the existing card menu (next to star),
  wired to the Phase 3 endpoint.

---

## Explicitly out of scope for this pass
- Full side-by-side diff view between versions (v2 badge + inline original
  is enough for v1)
- Batch deletion/archiving
- Cross-batch analytics ("which batch performed best") — there's no
  performance data flowing back into the app yet (no Meta Ads Manager
  integration), so there's nothing to rank batches by yet

---

## Suggested build order
1. Phase 0 (client fix) — small, isolated, do first.
2. Phase 1 (schema) — run the migration, confirm existing concepts still
   load fine with `batch_id IS NULL`.
3. Phase 2 (data layer) — testable independent of the API/UI.
4. Phase 3 (API) — verify with curl/Postman that a generation run actually
   creates a batch row and links concepts to it.
5. Phase 4 (UI) — last, once batches are reliably being created server-side.

Run `npm run build --prefix app` after each phase, same as the multi-brand
work — signature changes to `saveConcept`/`getConcepts` will surface every
call site that needs updating.
