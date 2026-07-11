# Concept History Implementation Progress

## ✅ Phase 0: Fix Supabase Client (COMPLETE)

**Changes:**
- Updated `lib/db/concepts.ts` to use `createRouteClient()` instead of `createClient()`
- Fixed `create/page.tsx` to use API routes instead of direct database calls (proper architecture)
- Removed unused `useAuth` import

**Build:** ✅ Passing

---

## ✅ Phase 1: Schema (COMPLETE - Migration Ready)

**Files Created:**
- `app/supabase/migrations/20260711_concept_batches.sql` - Complete migration SQL
- `app/scripts/apply-migration.js` - Helper script to show migration SQL and instructions

**Schema Changes:**
```sql
-- New table
CREATE TABLE concept_batches (
  id, brand_context_id, user_id, product_names[], requested_count, passed_count, created_at
)

-- Extended concepts table
ALTER TABLE concepts ADD COLUMN batch_id UUID;
ALTER TABLE concepts ADD COLUMN parent_concept_id UUID;
ALTER TABLE concepts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

**To Apply Migration:**
```bash
node app/scripts/apply-migration.js
```
Then copy the SQL to: https://supabase.com/dashboard/project/psedtwrbijwltlmfydds/sql/new

**Build:** ✅ Passing

---

## ✅ Phase 2: Data Layer (COMPLETE)

**Files Modified:**
- `app/src/lib/types.ts` - Added `batchId`, `parentConceptId`, `version` to `AdConcept`
- `app/src/lib/db/concepts.ts` - Added new functions:
  - `createConceptBatch()` - Create batch at generation start
  - `updateConceptBatchStats()` - Update pass count after generation
  - `getConceptBatches()` - List batches for timeline view
  - `getConceptsByBatch()` - Get concepts for a specific batch
  - Updated `getConcepts()` to return new fields
  - Updated `saveConcept()` to accept optional `batchId`, `parentConceptId`

**New Type:**
```typescript
export interface ConceptBatch {
  id: string;
  createdAt: string;
  productNames: string[];
  requestedCount: number;
  passedCount: number;
}
```

**Build:** ✅ Passing

---

## ✅ Phase 3: API Route (COMPLETE)

**Files Modified:**
- `app/src/app/api/create/batch/route.ts`:
  - Creates batch record before generation loop
  - Passes `batchId` to all concept inserts (both bulk and individual)
  - Updates batch stats with QC pass count after completion
  - Added `brand_context_id`, `batch_id`, `parent_concept_id`, `version` to bulk insert

**Flow:**
1. `createConceptBatch()` → get `batchId`
2. Generate concepts in parallel batches of 3
3. Insert concepts with `batch_id` field set
4. `updateConceptBatchStats()` with QC pass count

**Build:** ✅ Passing

---

## ✅ Phase 4: UI (COMPLETE)

**Files Modified:**
- `app/src/app/create/page.tsx` - Complete batch timeline UI
- `app/src/app/api/batches/route.ts` - New API endpoint to fetch batches
- `app/src/app/api/create/regenerate/route.ts` - New API endpoint to regenerate concepts

**Changes Implemented:**

### 1. API Endpoints Created
- `/api/batches` - GET endpoint returns list of batches for current brand
- `/api/create/regenerate` - POST endpoint regenerates a concept with new version

### 2. Data Fetching in Create Page
✅ Fetches batches from `/api/batches` on page load
✅ Groups concepts by `batchId` using Map
✅ Separates concepts with `batch_id IS NULL` as "Earlier concepts"
✅ Most recent batch expanded by default

### 3. Timeline UI - Batch Headers
✅ Replaced flat grid with batch timeline (`space-y-4` container)
✅ Each batch is collapsible with chevron indicator
✅ Batch header shows:
  - Formatted date/time (e.g., "Jul 11, 10:42 PM")
  - Concept count badge
  - Passed count badge (green)
  - Product name badges (purple)
✅ ChevronRight rotates 90° when expanded
✅ Hover effect on batch header buttons

### 4. Batch Content Grid
✅ When expanded, shows 2-column grid (`lg:grid-cols-2`)
✅ Contains all concept cards for that batch
✅ Bordered top separator when expanded
✅ Same card design as before (side-by-side images, glass buttons)

### 5. Earlier Concepts Section
✅ Separate collapsible section for `batch_id IS NULL` concepts
✅ Uses "earlier" as toggle key
✅ Same header style as batch headers
✅ Shows count of earlier concepts
✅ Collapsed by default
✅ Contains same 2-column grid when expanded

### 6. Version Badge
✅ Shows on concept header when `parentConceptId` is set
✅ Amber outlined badge: `"v{version} · regenerated"`
✅ Displays version number from database
✅ Positioned after product and ad type badges

### 7. Regenerate Button
✅ Added to action buttons row (alongside Copy, Script, Strategy)
✅ Green Sparkles icon with "Regenerate" label
✅ Disabled during generation
✅ Confirms with user before regenerating
✅ Calls `/api/create/regenerate` endpoint
✅ Updates concepts list and reloads batches after success

### 8. Regenerate Functionality
✅ `handleRegenerate()` function in create page
✅ Shows confirmation dialog
✅ Calls regenerate API with concept ID
✅ Adds new concept to top of list
✅ Reloads batch stats
✅ Error handling with user-friendly alerts

### 9. Regenerate API Implementation
✅ `/api/create/regenerate` POST endpoint created
✅ Fetches original concept from database
✅ Loads brand context, products, meta ads
✅ Finds reference ad and product from original
✅ Re-runs `generateReplicaAdConcept()` with hook analysis
✅ Generates new image with same aspect ratio
✅ Runs QC evaluation
✅ Saves with:
  - `parent_concept_id`: original concept ID
  - `version`: parent.version + 1
  - `batch_id`: same as parent (NOT a new batch)
  - New `id` and `created_at`
✅ Returns new concept to client

---

## Testing Checklist

### After Migration
- [ ] Visit `/create` page
- [ ] Verify existing concepts (with `batch_id IS NULL`) still load
- [ ] Verify no errors in console

### After Phase 4 UI
- [ ] Generate new concepts
- [ ] Verify they appear in a batch with current timestamp
- [ ] Verify batch shows product names, requested count, passed count
- [ ] Collapse/expand batch headers
- [ ] Verify "Earlier concepts" section shows old concepts
- [ ] Click "Regenerate" on a concept
- [ ] Verify regenerated concept appears with v2 badge
- [ ] Verify regenerated concept is in the SAME batch as original

---

## Next Steps

1. **Apply the migration** via Supabase Dashboard SQL Editor
2. **Test Phase 3** - Generate concepts and verify batch records are created
3. **Implement Phase 4 UI** - Replace flat grid with timeline
4. **Create regenerate endpoint** - `/api/create/regenerate`

---

## Notes

- **Backward compatibility:** All existing concepts will have `batch_id IS NULL` and will be grouped into "Earlier concepts" section
- **No data loss:** The migration only adds columns, doesn't modify existing data
- **Versioning:** When a concept is regenerated, it creates a NEW row (not an update) with `parent_concept_id` set and `version` incremented
- **Same batch:** Regenerated concepts belong to the same batch as their parent (not a new batch)
