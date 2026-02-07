import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  console.log('[Middleware] Path:', request.nextUrl.pathname);
  console.log('[Middleware] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING');
  console.log('[Middleware] PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'set' : 'MISSING');

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    console.log('[Middleware] User:', user ? user.email : 'not authenticated');
  } catch (error) {
    console.error('[Middleware] Auth error:', error);
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/welcome')
  ) {
    console.log('[Middleware] Redirecting to /welcome');
    const url = request.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  console.log('[Middleware] Allowing request through');
  return supabaseResponse;
}
