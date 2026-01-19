/**
 * Health check endpoint for Docker container
 * GET /api/health - Returns 200 if service is healthy
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { status: 'healthy', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
