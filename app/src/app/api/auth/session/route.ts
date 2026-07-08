import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, refresh_token } = body || {};

    let response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // If tokens provided, set session on server so cookies are emitted
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    } else {
      // No tokens => clear server session
      try {
        await supabase.auth.signOut();
      } catch (err) {
        // ignore
      }
    }

    return response;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
