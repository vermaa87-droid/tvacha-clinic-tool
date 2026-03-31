import { NextResponse, type NextRequest } from "next/server";

// Auth protection is handled client-side by the dashboard layout
// (useAuthStore checks). The middleware previously used @supabase/ssr
// cookies, but the client-side Supabase stores sessions in localStorage,
// so the middleware could never see the session — causing redirect loops.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
