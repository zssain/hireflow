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
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes are proxied to the Express backend via next.config rewrites
  // No middleware processing needed for them
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
