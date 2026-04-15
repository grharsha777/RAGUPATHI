import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
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

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Allow public pages without auth
  if (isPublicPage) {
    // If authenticated user visits login, redirect to dashboard
    if (request.auth && pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protected routes — require auth
  if (!request.auth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
