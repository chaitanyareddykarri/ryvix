import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tsoyrpgifovzwqtgpkkb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_1QBmq8pKJ3ssCAGufAzfYw_IdB6sYsY";

export const updateSession = async (request: NextRequest) => {
  try {
    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      },
    );

    // Authenticate user & refresh expired token safely
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch {
      user = null;
    }

    const pathname = request.nextUrl.pathname;
    const isApiRoute = pathname.startsWith("/api");
    const isPublicRoute = 
      pathname === "/" ||
      pathname.startsWith("/login") || 
      pathname.startsWith("/auth/reset-password") ||
      isApiRoute;

    // If user is authenticated and attempts to access /login, redirect to /dashboard
    if (user && pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // If user is unauthenticated and attempts to access protected routes, redirect to /login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err: unknown) {
    console.error("[Middleware Fatal Error]:", err);
    return NextResponse.next();
  }
};