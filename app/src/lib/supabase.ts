/**
 * Supabase Client Utilities
 *
 * Use the appropriate client based on context:
 * - Browser/Client Components: import { createBrowserClient } from '@/lib/supabase'
 * - Server Components: import { createServerClient } from '@/lib/supabase'
 * - API Routes: import { createRouteClient } from '@/lib/supabase'
 * - Middleware: import { updateSession } from '@/lib/supabase'
 */

export { createClient as createBrowserClient } from './supabase/client'
export { createClient as createServerClient } from './supabase/server'
export { createRouteClient } from './supabase/route'
export { updateSession } from './supabase/middleware'
