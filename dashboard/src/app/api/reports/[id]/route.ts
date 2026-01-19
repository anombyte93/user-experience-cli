/**
 * API endpoint for fetching a specific audit report
 * GET /api/reports/[id] - Returns specific report by ID
 */

import { NextRequest, NextResponse } from 'next/server';

const REPORTS_STORAGE = '/tmp/user-experience-reports.json';

interface AuditReport {
  id: string;
  toolName: string;
  toolPath: string;
  score: number;
  grade: string;
  redFlags: RedFlag[];
  completedAt: string;
  findings?: any;
}

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  evidence?: string[];
  fix?: string;
  location?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Read reports from storage
    const fs = await import('fs/promises');
    let reports: AuditReport[] = [];

    try {
      const data = await fs.readFile(REPORTS_STORAGE, 'utf-8');
      reports = JSON.parse(data);
    } catch {
      // File doesn't exist
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Find the specific report
    const report = reports.find(r => r.id === id);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
