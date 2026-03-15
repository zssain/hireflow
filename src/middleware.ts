import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/careers",
  "/apply",
  "/book",
  "/offer",
  "/invite",
  "/api/public",
  "/api/auth",
  "/api/cron",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow root page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // For API routes, check Authorization header
  if (pathname.startsWith("/api/")) {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // For dashboard routes, check for Firebase auth cookie/token
  // Since we use client-side Firebase auth, we rely on the client-side
  // auth guard in the dashboard layout. The middleware just ensures
  // the basic structure is valid.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
