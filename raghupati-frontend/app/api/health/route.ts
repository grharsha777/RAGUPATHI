import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ status: "error", error: "Backend returned error" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: "offline", error: error.message }, { status: 503 });
  }
}
