'use client'

import Link from 'next/link'
import { formatDate, getGradeColor } from '@/lib/utils'
import { Calendar, FileText, AlertTriangle } from 'lucide-react'

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
}

interface AuditReport {
  id: string
  toolName: string
  toolPath: string
  score: number
  grade: string
  redFlags: RedFlag[]
  completedAt: string
}

interface ReportCardProps {
  report: AuditReport
}

/**
 * Summary card for audit reports
 */
export function ReportCard({ report }: ReportCardProps) {
  const criticalCount = report.redFlags.filter(f => f.severity === 'critical').length
  const highCount = report.redFlags.filter(f => f.severity === 'high').length

  return (
    <Link href={`/reports/${report.id}`}>
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {report.toolName}
              </h3>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getGradeColor(report.grade)}`}>
                {report.grade}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{report.toolPath}</p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {report.score.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">/ 10</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(report.completedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            <span>{report.redFlags.length} red flags</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>View report</span>
          </div>
        </div>

        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                {highCount} high
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
