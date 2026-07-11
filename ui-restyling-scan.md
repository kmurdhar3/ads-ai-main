# UI Restyling Codebase Scan Report

## Executive Summary

**Total Files**: 76 TypeScript/CSS files
- **Pure UI/Presentation**: 16 files (shadcn/ui components + CSS)
- **Pure Business Logic**: 25 files (lib/, db/, API routes)
- **Mixed UI + Logic**: 13 files (page components — **NEEDS SEPARATION**)
- **Infrastructure**: 22 files (context, hooks, types, config)

## Category 1: PURE UI — Safe to Restyle (16 files)

### Styling Files
```
app/src/app/globals.css                          # Global styles, design tokens, glass-morphism utilities
```

### shadcn/ui Components (Presentation Only)
```
app/src/components/ui/badge.tsx                  # Badge component
app/src/components/ui/button.tsx                 # Button variants
app/src/components/ui/card.tsx                   # Card container
app/src/components/ui/dialog.tsx                 # Modal/dialog
app/src/components/ui/dropdown-menu.tsx          # Dropdown
app/src/components/ui/input.tsx                  # Text input
app/src/components/ui/label.tsx                  # Form label
app/src/components/ui/scroll-area.tsx            # Scrollable area
app/src/components/ui/select.tsx                 # Select dropdown
app/src/components/ui/separator.tsx              # Divider line
app/src/components/ui/sheet.tsx                  # Side panel
app/src/components/ui/sidebar.tsx                # Sidebar primitive
app/src/components/ui/skeleton.tsx               # Loading skeleton
app/src/components/ui/textarea.tsx               # Multi-line input
app/src/components/ui/tooltip.tsx                # Tooltip overlay
```

**Status**: ✅ **100% SAFE** — No business logic, only presentation

---

## Category 2: PURE BUSINESS LOGIC — DO NOT TOUCH (25 files)

### API Routes (13 files)
```
app/src/app/api/analysis/route.ts                # Pattern analysis endpoint
app/src/app/api/auth/session/route.ts            # Auth session
app/src/app/api/brand/route.ts                   # Brand scraping
app/src/app/api/brand-context/route.ts           # Brand context CRUD
app/src/app/api/competitors/route.ts             # Competitor data
app/src/app/api/create/route.ts                  # Concept CRUD
app/src/app/api/create/batch/route.ts            # Batch generation
app/src/app/api/knowledge/route.ts               # Knowledge base
app/src/app/api/pipeline/route.ts                # Legacy pipeline
app/src/app/api/proxy-image/route.ts             # Image proxy
app/src/app/api/search/route.ts                  # Meta Ad Library search
app/src/app/api/status/route.ts                  # Step completion check
app/src/app/api/tips/route.ts                    # Tips generation
```

### Service Layer (15 files)
```
app/src/lib/apify.ts                             # Apify API integration
app/src/lib/auth-server.ts                       # Server-side auth
app/src/lib/claude.ts                            # Claude API (ad gen, analysis, QC)
app/src/lib/claude-youtube.ts                    # YouTube transcript analysis
app/src/lib/competitor-scoring.ts                # Scoring algorithm ⚠️ CRITICAL
app/src/lib/csv.ts                               # CSV/JSON I/O
app/src/lib/firecrawl.ts                         # Website scraping
app/src/lib/gemini.ts                            # Gemini vision analysis
app/src/lib/kie-ai.ts                            # Image generation
app/src/lib/pipeline.ts                          # Legacy pipeline logic
app/src/lib/quality-control.ts                   # QC evaluation ⚠️ CRITICAL
app/src/lib/youtube.ts                           # YouTube scraping
app/src/lib/types.ts                             # TypeScript interfaces
app/src/lib/utils.ts                             # Utility functions (cn, etc.)
app/src/lib/supabase.ts                          # Supabase client
```

### Database Layer (4 files)
```
app/src/lib/db/brand-context.ts                  # Brand context DB ops
app/src/lib/db/concepts.ts                       # Concepts DB ops
app/src/lib/db/meta-ads.ts                       # Meta ads DB ops
app/src/lib/db/products.ts                       # Products DB ops
```

### Supabase Integration (4 files)
```
app/src/lib/supabase/client.ts                   # Browser client
app/src/lib/supabase/server.ts                   # Server client
app/src/lib/supabase/route.ts                    # Route handler client
app/src/lib/supabase/middleware.ts               # Auth middleware
```

**Status**: ⛔ **DO NOT MODIFY** — Pure business logic, no UI

---

## Category 3: MIXED UI + LOGIC — NEEDS CAREFUL SEPARATION (13 files)

### Page Components (10 files) — **PRIMARY CANDIDATES FOR REFACTORING**

#### ❌ HIGH COMPLEXITY: Large Pages (600-900 LOC)

```
app/src/app/brand/page.tsx                       # 889 LOC
  ├─ Logic: Brand scraping (fetch, SSE streaming, progress state)
  ├─ Logic: Instagram/YouTube form handling
  ├─ Logic: Gemini vision analysis trigger
  ├─ Logic: Brand/product data fetching (useEffect)
  ├─ Logic: Collapsible state management (products, visuals, details)
  ├─ Logic: Lightbox image viewer state
  └─ UI: Brand identity card, product grid, visual gallery, details sections
  
  RECOMMENDATION: Extract hooks
    - useBrandData() — data fetching logic
    - useBrandScraper() — SSE streaming, progress tracking
    - useLightbox() — lightbox open/close/navigation
    - BrandPage → pure presentation component
```

```
app/src/app/create/page.tsx                      # 713 LOC
  ├─ Logic: Concept generation (batch API, SSE streaming)
  ├─ Logic: Product filter state
  ├─ Logic: Concept count input (1-30 validation)
  ├─ Logic: Star/unstar concepts (PATCH API)
  ├─ Logic: Detail modal state (copy/script/strategy tabs)
  ├─ Logic: Elapsed timer (setInterval)
  ├─ Logic: AbortController for cancellation
  └─ UI: Generation bar, concept cards, side-by-side comparison, modal
  
  RECOMMENDATION: Extract hooks
    - useConceptGenerator() — batch generation, SSE, timer, abort
    - useConceptData() — fetch, filter, star/unstar
    - BrandPage → pure presentation component
```

```
app/src/app/competitors/page.tsx                 # 624 LOC
  ├─ Logic: Keyword search (SSE streaming, batch progress)
  ├─ Logic: Keyword suggestion API call
  ├─ Logic: Advertiser expansion state
  ├─ Logic: Elapsed timer
  ├─ Logic: AbortController
  ├─ Logic: Ads-per-keyword input (1-30 validation)
  └─ UI: Search form, advertiser cards, ad grids, progress bar
  
  RECOMMENDATION: Extract hooks
    - useCompetitorSearch() — SSE streaming, progress, abort
    - useKeywordSuggestions() — suggest API call
    - CompetitorsPage → pure presentation component
```

#### ⚠️ MEDIUM COMPLEXITY: Moderate Pages (200-400 LOC)

```
app/src/app/analysis/page.tsx                    # ~400 LOC (est.)
  ├─ Logic: Analysis data fetching
  ├─ Logic: Hook/pattern expansion state
  ├─ Logic: Lightbox for ad thumbnails
  └─ UI: Hook cards, pattern cards, thumbnails
  
  RECOMMENDATION: Extract hooks
    - useAnalysisData() — fetch analysis
    - useLightbox() — image viewer (shared with brand page)
```

```
app/src/app/knowledge/page.tsx                   # ~300 LOC (est.)
  ├─ Logic: Knowledge base fetching
  ├─ Logic: Entry expansion state
  └─ UI: Video cards, markdown content
  
  RECOMMENDATION: Extract hooks
    - useKnowledgeData() — fetch knowledge entries
```

```
app/src/app/run/page.tsx                         # ~500 LOC (est.)
  ├─ Logic: Pipeline state management (PipelineContext)
  ├─ Logic: Multi-step pipeline execution
  ├─ Logic: SSE streaming
  └─ UI: Step indicators, progress bars, output display
  
  RECOMMENDATION: Keep PipelineContext, extract presentation
```

#### ✅ LOW COMPLEXITY: Simple Pages (<200 LOC)

```
app/src/app/login/page.tsx                       # ~150 LOC (est.)
  ├─ Logic: Form submission, Supabase auth
  └─ UI: Login form
  
  RECOMMENDATION: Extract useAuth() hook
```

```
app/src/app/signup/page.tsx                      # ~150 LOC (est.)
  ├─ Logic: Form submission, Supabase auth
  └─ UI: Signup form
  
  RECOMMENDATION: Extract useAuth() hook (shared with login)
```

```
app/src/app/tips/page.tsx                        # ~200 LOC (est.)
  ├─ Logic: Tips fetching, regeneration API call
  └─ UI: Tips display, markdown
```

```
app/src/app/sources/page.tsx                     # ~200 LOC (est.)
  ├─ Logic: Sources data fetching
  └─ UI: YouTube thumbnails, provenance display
```

### Shared Components (3 files) — **MODERATE SEPARATION NEEDED**

```
app/src/components/meta-ad-card.tsx              # 360 LOC
  ├─ Logic: Video playback state (playing, paused, muted)
  ├─ Logic: Text expansion toggle
  ├─ Logic: Image proxy URL building
  ├─ Logic: Video ref management
  └─ UI: Card layout, image/video display, badges, play button
  
  RECOMMENDATION: Extract hooks
    - useVideoPlayer() — playback state, ref, controls
    - MetaAdCard → presentation component with hook
```

```
app/src/components/app-sidebar.tsx               # 144 LOC
  ├─ Logic: Status data fetching (hasBrand, hasSearch, etc.)
  ├─ Logic: Step completion indicators
  ├─ Logic: User auth check (useAuth)
  └─ UI: Sidebar navigation, step icons, badges
  
  RECOMMENDATION: Extract hooks
    - useStepStatus() — fetch /api/status
    - AppSidebar → presentation component
```

```
app/src/components/markdown-content.tsx          # ~100 LOC (est.)
  ├─ Logic: Markdown parsing (react-markdown)
  └─ UI: Rendered markdown with custom components
  
  STATUS: Already well-separated (logic is library-based)
```

**Status**: ⚠️ **NEEDS SEPARATION** — Extract hooks before restyling

---

## Category 4: INFRASTRUCTURE — MINIMAL TOUCH (7 files)

### Context Providers (2 files)
```
app/src/context/auth-context.tsx                 # Auth state management
app/src/context/pipeline-context.tsx             # Pipeline state (legacy)
```

**Status**: ⚠️ **Logic only** — May need UI updates if Provider wrappers change

### Custom Hooks (1 file)
```
app/src/hooks/use-mobile.ts                      # Mobile breakpoint detection
```

**Status**: ✅ **Pure logic** — No UI

### Layout Components (2 files)
```
app/src/app/layout.tsx                           # Root layout wrapper
app/src/components/layout-content.tsx            # Sidebar + content layout
```

**Status**: ⚠️ **Structural** — May need layout grid/flex changes for new design

### Auth Guards (1 file)
```
app/src/components/protected-route.tsx           # Auth route wrapper
```

**Status**: ✅ **Pure logic** — No UI changes needed

### Top-Level Routes (2 files)
```
app/src/app/page.tsx                             # Root redirect (3 LOC)
app/src/components/top-bar.tsx                   # Top navigation bar
```

**Status**: app/page.tsx is pure logic (redirect), top-bar.tsx is UI

---

## Separation Strategy: BEFORE Restyling

### Step 1: Extract Custom Hooks (Priority Order)

#### High Priority (Large Pages)
1. **app/src/hooks/use-brand-data.ts** ← Extract from brand/page.tsx
2. **app/src/hooks/use-brand-scraper.ts** ← Extract from brand/page.tsx
3. **app/src/hooks/use-concept-generator.ts** ← Extract from create/page.tsx
4. **app/src/hooks/use-concept-data.ts** ← Extract from create/page.tsx
5. **app/src/hooks/use-competitor-search.ts** ← Extract from competitors/page.tsx

#### Medium Priority (Shared Components)
6. **app/src/hooks/use-video-player.ts** ← Extract from meta-ad-card.tsx
7. **app/src/hooks/use-step-status.ts** ← Extract from app-sidebar.tsx
8. **app/src/hooks/use-lightbox.ts** ← Shared by brand + analysis pages

#### Low Priority (Smaller Pages)
9. **app/src/hooks/use-auth-form.ts** ← Shared by login + signup
10. **app/src/hooks/use-analysis-data.ts** ← Extract from analysis/page.tsx
11. **app/src/hooks/use-knowledge-data.ts** ← Extract from knowledge/page.tsx

### Step 2: Page Component Refactor Pattern

**BEFORE** (Mixed):
```tsx
// app/src/app/create/page.tsx
export default function CreatePage() {
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  useEffect(() => {
    fetch("/api/create").then(/* ... */)
  }, []);
  
  const handleGenerate = async () => {
    const eventSource = new EventSource(/* SSE logic */);
    // 200 lines of SSE handling, progress tracking, etc.
  };
  
  return (
    <div className="glass rounded-2xl p-6">
      {/* 500 lines of JSX */}
    </div>
  );
}
```

**AFTER** (Separated):
```tsx
// app/src/hooks/use-concept-generator.ts
export function useConceptGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);
  
  const generate = useCallback(async (count: number, productNames?: string[]) => {
    // All SSE logic, progress tracking, abort handling
  }, []);
  
  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);
  
  return { generating, progress, generate, cancel };
}

// app/src/hooks/use-concept-data.ts
export function useConceptData() {
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch("/api/create").then(/* ... */);
  }, []);
  
  const star = useCallback(async (id: string) => { /* ... */ }, []);
  
  return { concepts, loading, star };
}

// app/src/app/create/page.tsx (PURE PRESENTATION)
import { useConceptGenerator } from "@/hooks/use-concept-generator";
import { useConceptData } from "@/hooks/use-concept-data";

export default function CreatePage() {
  const { concepts, loading, star } = useConceptData();
  const { generating, progress, generate, cancel } = useConceptGenerator();
  
  return (
    <div className="glass rounded-2xl p-6">
      {/* 500 lines of PURE JSX — no logic */}
    </div>
  );
}
```

---

## Files Requiring NO Separation (Already Clean)

### Well-Separated Components
- `app/src/components/markdown-content.tsx` — Logic is library-based (react-markdown)
- `app/src/components/ui/*` — All shadcn components are pure presentation
- `app/src/lib/*` — All service/logic files have zero UI

### Minimal Touch Files
- `app/src/app/page.tsx` — 3-line redirect (no UI)
- `app/src/hooks/use-mobile.ts` — Pure hook (no UI)
- `app/src/context/*` — Context providers (logic only)

---

## Summary: File Categorization

| Category | Count | Action Required |
|----------|-------|-----------------|
| **Pure UI** (shadcn + CSS) | 16 | ✅ Restyle freely |
| **Pure Logic** (lib, API, db) | 25 | ⛔ Do not touch |
| **Mixed — Needs Separation** | 13 | ⚠️ Extract hooks first |
| **Infrastructure** (context, hooks) | 7 | ⚠️ Minimal touch |
| **Tests** | 3 | ✅ Preserve (run after changes) |
| **Config** | 12 | ⛔ Do not touch |

---

## Next Steps (Per Your Request)

### 1. ✅ SCAN COMPLETE — This Document

### 2. PROPOSE NEW VISUAL DIRECTION
Once you approve this scan, I will propose:
- New color palette (move away from dark purple glass-morphism)
- New typography system
- New spacing/sizing scale
- New component style (e.g., brutalist, neumorphic, minimalist, etc.)
- Updated design tokens in globals.css

### 3. REFACTOR PLAN
For each "Mixed" file, I will create:
- Custom hook extraction plan
- File-by-file diff preview
- Risk assessment (Low/Medium/High)

### 4. IMPLEMENTATION
- Extract hooks (preserve all logic)
- Run tests to verify no breakage
- Restyle UI components
- Run tests again
- Provide diff summary grouped by "Logic Preserved" vs "UI Changed"

---

## Questions for You

Before proceeding to Step 2 (visual direction proposal):

1. **Separation Scope**: Do you want me to extract ALL 13 mixed files, or prioritize the big 3 (brand, create, competitors)?

2. **Visual Direction**: Any preferences? Options:
   - **Option A**: Light, airy, minimal (away from dark glass)
   - **Option B**: Bold, high-contrast, brutalist
   - **Option C**: Soft, neumorphic, pastel
   - **Option D**: Warm, earthy, organic tones
   - **Option E**: Your own direction

3. **Timing**: Should I:
   - Extract hooks FIRST, then propose design (safer)
   - Propose design FIRST, then extract hooks (faster to see vision)

4. **Test Coverage**: I see 3 test files. Do you have E2E tests, or just unit tests?

---

## Risk Assessment

### Low Risk (Pure UI files)
- shadcn/ui components ✅
- globals.css ✅

### Medium Risk (Needs Hook Extraction)
- Page components (if hooks extracted properly) ⚠️
- meta-ad-card.tsx ⚠️
- app-sidebar.tsx ⚠️

### High Risk (Don't Touch)
- All lib/* files ⛔
- All API routes ⛔
- Database layer ⛔

### Zero Risk (Already Separated)
- markdown-content.tsx ✅
- use-mobile.ts ✅
