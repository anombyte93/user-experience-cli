/**
 * API endpoint for fetching audit reports
 * GET /api/reports - Returns all audit reports
 * GET /api/reports/[id] - Returns specific report
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock report storage (in production, use a database)
const REPORTS_STORAGE = '/tmp/user-experience-reports.json';

interface AuditReport {
  id: string;
  toolName: string;
  toolPath: string;
  score: number;
  grade: string;
  redFlags: RedFlag[];
  completedAt: string;
  findings: any;
}

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  evidence: string[];
  fix: string;
  location?: string;
}

/**
 * GET /api/reports
 * Fetch all audit reports
 */
export async function GET(request: NextRequest) {
  try {
    // Read reports from storage
    const fs = await import('fs/promises');
    const path = await import('path');

    let reports: AuditReport[] = [];

    try {
      const data = await fs.readFile(REPORTS_STORAGE, 'utf-8');
      reports = JSON.parse(data);
    } catch {
      // No reports yet, return empty array
      reports = [];
    }

    // Support filtering by query params
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const minScore = searchParams.get('minScore');

    let filtered = reports;

    if (severity) {
      filtered = filtered.filter(r =>
        r.redFlags.some(f => f.severity === severity)
      );
    }

    if (minScore) {
      filtered = filtered.filter(r => r.score >= parseFloat(minScore));
    }

    return NextResponse.json({
      reports: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Store a new audit report (called by CLI after audit completes)
 */
export async function POST(request: NextRequest) {
  try {
    const reportData: Partial<AuditReport> = await request.json();

    // Validate required fields
    if (!reportData.toolName || !reportData.toolPath || reportData.score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: toolName, toolPath, score' },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    const id = reportData.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const report: AuditReport = {
      id,
      toolName: reportData.toolName,
      toolPath: reportData.toolPath,
      score: reportData.score,
      grade: reportData.grade || getGrade(reportData.score),
      redFlags: reportData.redFlags || [],
      completedAt: reportData.completedAt || new Date().toISOString(),
      findings: reportData.findings || {}
    };

    // Load existing reports
    const fs = await import('fs/promises');
    let reports: AuditReport[] = [];

    try {
      const data = await fs.readFile(REPORTS_STORAGE, 'utf-8');
      reports = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    // Add new report
    reports.push(report);

    // Save back to storage
    const pathModule = await import('path');
    await fs.mkdir(pathModule.dirname(REPORTS_STORAGE), { recursive: true });
    await fs.writeFile(REPORTS_STORAGE, JSON.stringify(reports, null, 2));

    return NextResponse.json({
      success: true,
      report,
      message: 'Report stored successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error storing report:', error);
    return NextResponse.json(
      { error: 'Failed to store report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports
 * Clear all reports (for testing/debugging)
 */
export async function DELETE() {
  try {
    const fs = await import('fs/promises');

    await fs.unlink(REPORTS_STORAGE).catch(() => {
      // File doesn't exist, that's fine
    });

    return NextResponse.json({
      success: true,
      message: 'All reports cleared'
    });

  } catch (error) {
    console.error('Error clearing reports:', error);
    return NextResponse.json(
      { error: 'Failed to clear reports' },
      { status: 500 }
    );
  }
}

function getGrade(score: number): string {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B';
  if (score >= 6) return 'C';
  if (score >= 4) return 'D';
  return 'F';
}
