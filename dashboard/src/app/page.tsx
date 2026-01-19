/**
 * Dashboard main page
 * Displays audit reports with charts and filtering
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Header } from '@/components/header';
import { ReportCard } from '@/components/report-card';

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

export default function DashboardPage() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    // Load reports from local storage or API
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports([]); // Fallback to empty on error
    } finally {
      setLoading(false);
    }
  }

  const filteredReports = reports.filter(report => {
    if (filterSeverity === 'all') return true;
    return report.redFlags.some(flag => flag.severity === filterSeverity);
  });

  const stats = {
    total: reports.length,
    critical: reports.flatMap(r => r.redFlags).filter(f => f.severity === 'critical').length,
    high: reports.flatMap(r => r.redFlags).filter(f => f.severity === 'high').length,
    avgScore: reports.length > 0
      ? reports.reduce((sum, r) => sum + r.score, 0) / reports.length
      : 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">User Experience Audit Dashboard</h1>
          </div>
          <p className="text-gray-600">Monitor and analyze UX audit results across your tools</p>
        </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Audits"
          value={stats.total}
          icon={CheckCircle}
          color="blue"
        />
        <StatCard
          title="Critical Issues"
          value={stats.critical}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="High Priority"
          value={stats.high}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Avg Score"
          value={`${stats.avgScore.toFixed(1)}/10`}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700">Filter by severity:</label>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600">Run an audit to generate your first report</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number | string;
  icon: any;
  color: 'blue' | 'red' | 'orange' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-green-50 text-green-700'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
