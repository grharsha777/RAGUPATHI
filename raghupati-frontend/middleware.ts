import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Public routes — no auth required
    const isPublicPage =
      pathname === "/" ||
      pathname.startsWith("/login");

    const isPublicAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/brand") ||
      pathname.startsWith("/api/auth");

    if (isPublicAsset || isPublicPage) {
      return NextResponse.next();
    }

    // For protected routes, redirect to login (auth handled client-side for now)
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  } catch (error) {
    // If middleware fails, allow request to proceed
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
