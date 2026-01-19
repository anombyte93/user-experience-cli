'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react'
import { ScoreBadge } from '@/components/score-badge'
import { RedFlagList } from '@/components/red-flag-list'
import { ExportButton } from '@/components/export-button'
import { formatDate } from '@/lib/utils'

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  evidence?: string[]
  fix?: string
  location?: string
}

interface AuditReport {
  id: string
  toolName: string
  toolPath: string
  score: number
  grade: string
  redFlags: RedFlag[]
  completedAt: string
  findings?: any
}

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchReport(params.id as string)
    }
  }, [params.id])

  async function fetchReport(id: string) {
    try {
      const response = await fetch(`/api/reports/${id}`)
      if (!response.ok) {
        throw new Error('Report not found')
      }
      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This report does not exist'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const severityStats = {
    critical: report.redFlags.filter(f => f.severity === 'critical').length,
    high: report.redFlags.filter(f => f.severity === 'high').length,
    medium: report.redFlags.filter(f => f.severity === 'medium').length,
    low: report.redFlags.filter(f => f.severity === 'low').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">{report.toolName}</h1>
              </div>
              <p className="text-gray-600">{report.toolPath}</p>
              <p className="text-sm text-gray-500 mt-2">
                Completed on {formatDate(report.completedAt)}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <ScoreBadge score={report.score} grade={report.grade} size="lg" />
              <ExportButton report={report} format="pdf" tier="pro" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Critical"
            value={severityStats.critical}
            color="red"
          />
          <StatCard
            title="High"
            value={severityStats.high}
            color="orange"
          />
          <StatCard
            title="Medium"
            value={severityStats.medium}
            color="yellow"
          />
          <StatCard
            title="Low"
            value={severityStats.low}
            color="blue"
          />
        </div>

        {/* Score Analysis */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Score Analysis</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Overall Score</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-gray-900">
                  {report.score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  <div>Grade: {report.grade}</div>
                  <div>Based on {report.redFlags.length} issues found</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h3>
              <p className="text-sm text-gray-600">
                {report.score >= 8
                  ? 'Excellent user experience! Minor improvements recommended.'
                  : report.score >= 6
                  ? 'Good user experience with some areas for improvement.'
                  : report.score >= 4
                  ? 'Fair user experience. Several critical issues should be addressed.'
                  : 'Poor user experience. Major redesign recommended.'}
              </p>
            </div>
          </div>
        </div>

        {/* Red Flags */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Red Flags</h2>
            <span className="text-sm text-gray-600">
              {report.redFlags.length} issues found
            </span>
          </div>

          {report.redFlags.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Red Flags!</h3>
              <p className="text-gray-600">
                This tool has excellent user experience. No critical issues were found.
              </p>
            </div>
          ) : (
            <RedFlagList flags={report.redFlags} showEvidence />
          )}
        </div>

        {/* Detailed Findings */}
        {report.findings && Object.keys(report.findings).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Findings</h2>
            <pre className="bg-gray-50 rounded p-4 overflow-x-auto text-sm">
              {JSON.stringify(report.findings, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: {
  title: string
  value: number
  color: 'red' | 'orange' | 'yellow' | 'blue'
}) {
  const colors = {
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      </div>
    </div>
  )
}
