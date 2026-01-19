/**
 * API endpoint for usage statistics
 * GET /api/stats - Returns usage statistics by tier
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
}

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

interface UserStats {
  tier: 'free' | 'pro' | 'enterprise';
  auditsThisMonth: number;
  auditsTotal: number;
  quotaLimit: number;
  quotaRemaining: number;
  avgScore: number;
  criticalIssues: number;
  highIssues: number;
  lastAudit?: string;
}

export async function GET(request: NextRequest) {
  try {
    const fs = await import('fs/promises');
    let reports: AuditReport[] = [];

    try {
      const data = await fs.readFile(REPORTS_STORAGE, 'utf-8');
      reports = JSON.parse(data);
    } catch {
      // No reports yet
    }

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const auditsThisMonth = reports.filter(r =>
      new Date(r.completedAt) >= startOfMonth
    ).length;

    const avgScore = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.score, 0) / reports.length
      : 0;

    const allFlags = reports.flatMap(r => r.redFlags);
    const criticalIssues = allFlags.filter(f => f.severity === 'critical').length;
    const highIssues = allFlags.filter(f => f.severity === 'high').length;

    // Get user tier from query params or default to free
    const { searchParams } = new URL(request.url);
    const tier = (searchParams.get('tier') || 'free') as 'free' | 'pro' | 'enterprise';

    const tierLimits = {
      free: 5,
      pro: 100,
      enterprise: Infinity
    };

    const stats: UserStats = {
      tier,
      auditsThisMonth,
      auditsTotal: reports.length,
      quotaLimit: tierLimits[tier],
      quotaRemaining: Math.max(0, tierLimits[tier] - auditsThisMonth),
      avgScore: Math.round(avgScore * 10) / 10,
      criticalIssues,
      highIssues,
      lastAudit: reports.length > 0
        ? reports[reports.length - 1].completedAt
        : undefined
    };

    return NextResponse.json({
      stats,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
