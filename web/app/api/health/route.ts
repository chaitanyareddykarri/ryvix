import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
// Liveness only. Database/provider readiness is checked independently.
export function GET() {
  return NextResponse.json({ status: 'ok', revision: process.env.RYVIX_RELEASE_SHA || 'development' },
    { headers: { 'Cache-Control': 'no-store' } });
}
