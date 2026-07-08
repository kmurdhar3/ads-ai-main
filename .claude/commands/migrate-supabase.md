# Migrate to Supabase Database

Migrate the ads-ai project from file-based storage (JSON/CSV) to Supabase for multi-user support, authentication, real-time collaboration, and production deployment.

## Context

**Current State:**
- File-based storage in `/data` folder (JSON + CSV)
- Single-user local tool
- No authentication
- No concurrent write support

**Target State:**
- Supabase Postgres database
- Multi-user with authentication
- User-scoped data (each user has their own brands, concepts, etc.)
- Real-time updates (optional)
- Production-ready with proper error handling

## Instructions

### Phase 1: Setup Supabase

1. **Create Supabase project**
   - Go to https://supabase.com and create a free project
   - Note the project URL and anon key
   - Add to `.env`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

2. **Install Supabase client**
   ```bash
   cd app
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

3. **Create Supabase client utility**
   - Create `app/src/lib/supabase.ts` with browser and server clients
   - Follow Next.js 15 App Router patterns

### Phase 2: Database Schema Design

Design tables that match current data structures:

**Tables to create:**

1. **users** (handled by Supabase Auth automatically)
   - id (uuid, primary key)
   - email
   - created_at

2. **brand_contexts**
   - id (uuid, primary key)
   - user_id (uuid, foreign key → users.id)
   - name (text)
   - description (text)
   - url (text)
   - instagram_handle (text)
   - keywords (text[])
   - visual_analysis (jsonb)
   - raw_data (jsonb) - full brand context JSON
   - created_at (timestamp)
   - updated_at (timestamp)

3. **products**
   - id (uuid, primary key)
   - brand_context_id (uuid, foreign key → brand_contexts.id)
   - user_id (uuid, foreign key → users.id)
   - name (text)
   - description (text)
   - price (text)
   - created_at (timestamp)

4. **search_results**
   - id (uuid, primary key)
   - brand_context_id (uuid, foreign key → brand_contexts.id)
   - user_id (uuid, foreign key → users.id)
   - keywords (text[])
   - searched_at (timestamp)
   - advertisers (jsonb) - scored advertisers array
   - total_ads_scraped (integer)
   - raw_data (jsonb) - full search results JSON

5. **meta_ads**
   - id (text, primary key) - Meta ad library ID
   - search_result_id (uuid, foreign key → search_results.id)
   - user_id (uuid, foreign key → users.id)
   - advertiser (text)
   - headline (text)
   - primary_text (text)
   - description (text)
   - cta_text (text)
   - image_url (text)
   - video_url (text)
   - local_image_path (text)
   - platforms (text)
   - start_date (text)
   - is_active (boolean)
   - days_running (integer)
   - created_at (timestamp)

6. **analysis_results**
   - id (uuid, primary key)
   - brand_context_id (uuid, foreign key → brand_contexts.id)
   - user_id (uuid, foreign key → users.id)
   - hooks (jsonb) - hook analysis array
   - patterns (jsonb) - winning patterns array
   - raw_data (jsonb) - full analysis JSON
   - created_at (timestamp)

7. **concepts**
   - id (uuid, primary key)
   - brand_context_id (uuid, foreign key → brand_contexts.id)
   - user_id (uuid, foreign key → users.id)
   - product_name (text)
   - headline (text)
   - body (text)
   - description (text)
   - cta_text (text)
   - image_prompt (text)
   - generated_image_url (text)
   - video_script (text)
   - ad_type (text) - 'static' or 'video'
   - target_audience (text)
   - format (text)
   - placements (text)
   - rationale (text)
   - inspiration_ad_ids (text)
   - starred (boolean, default false)
   - quality_score (integer)
   - quality_feedback (text)
   - qc_passed (boolean)
   - created_at (timestamp)

**Create SQL migration:**
- Create `supabase/migrations/001_initial_schema.sql`
- Include all table definitions
- Add Row Level Security (RLS) policies for each table
- Add indexes on user_id and foreign keys

### Phase 3: Row Level Security (RLS) Policies

For each table, create policies:

```sql
-- Enable RLS
ALTER TABLE brand_contexts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own brand contexts"
  ON brand_contexts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own brand contexts"
  ON brand_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own brand contexts"
  ON brand_contexts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own brand contexts"
  ON brand_contexts FOR DELETE
  USING (auth.uid() = user_id);
```

Repeat for all tables with user_id.

### Phase 4: Authentication Setup

1. **Create auth context**
   - Create `app/src/context/auth-context.tsx`
   - Wrap app with AuthProvider
   - Provide user, signIn, signOut, signUp methods

2. **Add auth UI**
   - Create login page at `app/src/app/login/page.tsx`
   - Create signup page at `app/src/app/signup/page.tsx`
   - Use Supabase Auth UI or custom forms
   - Redirect authenticated users to `/brand`
   - Redirect unauthenticated users to `/login`

3. **Protect routes**
   - Add middleware at `app/src/middleware.ts`
   - Check auth on all protected routes
   - Redirect to login if not authenticated

### Phase 5: Data Layer Migration

1. **Create new data access layer**
   - Create `app/src/lib/db/` folder
   - Create files:
     - `brand-context.ts` - CRUD for brand contexts
     - `products.ts` - CRUD for products
     - `search-results.ts` - CRUD for search results
     - `meta-ads.ts` - CRUD for meta ads
     - `analysis.ts` - CRUD for analysis
     - `concepts.ts` - CRUD for concepts

2. **Migration strategy for each module:**

   **Example: Brand Context**
   ```typescript
   // app/src/lib/db/brand-context.ts
   import { createClient } from '@/lib/supabase'
   
   export async function getBrandContext(userId: string) {
     const supabase = createClient()
     const { data, error } = await supabase
       .from('brand_contexts')
       .select('*')
       .eq('user_id', userId)
       .order('updated_at', { ascending: false })
       .limit(1)
       .single()
     
     if (error && error.code !== 'PGRST116') throw error
     return data
   }
   
   export async function saveBrandContext(userId: string, context: BrandContext) {
     const supabase = createClient()
     const { data, error } = await supabase
       .from('brand_contexts')
       .upsert({
         user_id: userId,
         name: context.name,
         description: context.description,
         raw_data: context,
         updated_at: new Date().toISOString()
       })
       .select()
       .single()
     
     if (error) throw error
     return data
   }
   ```

   Repeat for all data types.

### Phase 6: Update API Routes

Update all API routes to:
1. Get authenticated user from session
2. Use new database functions instead of CSV/JSON
3. Pass user_id to all queries
4. Handle errors properly

**Example: Update `/api/brand-context/route.ts`**
```typescript
import { createClient } from '@/lib/supabase'
import { getBrandContext, saveBrandContext } from '@/lib/db/brand-context'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const context = await getBrandContext(user.id)
  return Response.json(context)
}

export async function PUT(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const body = await req.json()
  const result = await saveBrandContext(user.id, body)
  return Response.json(result)
}
```

Update these routes:
- `/api/brand` → user-scoped brand scraping
- `/api/brand-context` → user-scoped brand context
- `/api/search` → user-scoped search results
- `/api/competitors` → user-scoped meta ads
- `/api/analysis` → user-scoped analysis
- `/api/create` → user-scoped concepts
- `/api/status` → check user's data completion

### Phase 7: Update Frontend Components

1. **Add auth UI**
   - Login/signup pages
   - User menu in top bar (show email, logout button)
   - Protected route wrapper

2. **Update data fetching**
   - All pages already use API routes
   - API routes now return user-scoped data automatically
   - No changes needed if API routes are updated correctly

3. **Add loading states**
   - Show loading while checking auth
   - Show empty states for new users

### Phase 8: File Storage Migration

For images (brand assets, competitor ads, generated images):

**Option A: Keep local file storage**
- Store file paths in database
- Keep `/data/brand-assets/`, `/data/competitor-ads/`, `/data/generated-images/`
- Prefix paths with user_id: `/data/user-{uuid}/brand-assets/`

**Option B: Supabase Storage**
- Use Supabase Storage buckets
- Create buckets: `brand-assets`, `competitor-ads`, `generated-images`
- Upload files to Supabase Storage
- Store public URLs in database
- Update download functions to use Supabase Storage

Recommended: **Option A** for simplicity, **Option B** for full cloud deployment.

### Phase 9: Data Migration Script

Create a migration script to move existing data to Supabase:

```typescript
// scripts/migrate-to-supabase.ts
import { readBrandContext, readProducts, readConcepts } from '@/lib/csv'
import { saveBrandContext, saveProducts, saveConcepts } from '@/lib/db'

async function migrate() {
  // Read existing data
  const brandContext = readBrandContext()
  const products = readProducts()
  const concepts = readConcepts()
  
  // Create a default user (or prompt for user_id)
  const userId = 'your-user-uuid-from-supabase'
  
  // Save to Supabase
  if (brandContext) {
    await saveBrandContext(userId, brandContext)
  }
  
  for (const product of products) {
    await saveProduct(userId, product)
  }
  
  for (const concept of concepts) {
    await saveConcept(userId, concept)
  }
  
  console.log('Migration complete!')
}

migrate()
```

### Phase 10: Testing

1. **Test authentication flow**
   - Sign up new user
   - Log in
   - Log out
   - Try accessing protected routes while logged out

2. **Test data isolation**
   - Create two users
   - Each user creates brand context
   - Verify users can't see each other's data

3. **Test full workflow**
   - Sign up → Brand scraping → Competitor search → Analysis → Concept generation
   - Verify all data saves and loads correctly

4. **Test concurrent operations**
   - Two users generating concepts simultaneously
   - No conflicts or overwrites

### Phase 11: Deployment

1. **Environment variables**
   - Add Supabase vars to Vercel/production
   - Keep all AI API keys

2. **Database**
   - Supabase project is already hosted
   - Run migrations in Supabase dashboard

3. **Deploy**
   - Push to Vercel/your hosting platform
   - Test production authentication
   - Monitor Supabase dashboard for errors

## Migration Checklist

- [ ] Create Supabase project
- [ ] Install dependencies
- [ ] Create database schema
- [ ] Set up RLS policies
- [ ] Create auth context and UI
- [ ] Create data access layer (`lib/db/`)
- [ ] Update all API routes
- [ ] Add auth middleware
- [ ] Update frontend (login/signup pages, user menu)
- [ ] Migrate existing data
- [ ] Test authentication
- [ ] Test data isolation
- [ ] Test full workflow
- [ ] Deploy to production

## Notes

- Keep CSV/JSON functions temporarily for backwards compatibility
- Gradually migrate one data type at a time
- Test thoroughly before removing file-based storage
- Consider keeping local file storage as backup/export option

## Expected Outcome

After completion:
- Multi-user support with email/password auth
- Each user has isolated data
- Production-ready deployment
- Better search/filtering with SQL queries
- Concurrent write operations supported
- Optional: Real-time updates using Supabase subscriptions
