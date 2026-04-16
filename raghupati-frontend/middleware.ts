import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal middleware that just passes through
// Auth is handled client-side via next-auth on the page level
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Disable middleware to prevent Edge Function issues
export const config = {
  matcher: [],
};
