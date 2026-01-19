'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { getSeverityColor } from '@/lib/utils'

interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  evidence?: string[]
  fix?: string
  location?: string
}

interface RedFlagListProps {
  flags: RedFlag[]
  maxVisible?: number
  showEvidence?: boolean
}

/**
 * Display list of red flags with severity indicators
 */
export function RedFlagList({
  flags,
  maxVisible,
  showEvidence = true
}: RedFlagListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpanded(newExpanded)
  }

  const visibleFlags = maxVisible ? flags.slice(0, maxVisible) : flags
  const hasMore = maxVisible && flags.length > maxVisible

  const severityIcons = {
    critical: '🚨',
    high: '⚠️',
    medium: '📋',
    low: 'ℹ️'
  }

  return (
    <div className="space-y-3">
      {visibleFlags.map((flag, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg shadow border-l-4 ${
            flag.severity === 'critical' ? 'border-red-500' :
            flag.severity === 'high' ? 'border-orange-500' :
            flag.severity === 'medium' ? 'border-yellow-500' :
            'border-blue-500'
          }`}
        >
          <button
            onClick={() => toggleExpand(index)}
            className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 transition"
          >
            <span className="text-xl">{severityIcons[flag.severity]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getSeverityColor(flag.severity)}`}>
                  {flag.severity.toUpperCase()}
                </span>
                {flag.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {flag.location}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900">{flag.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
            </div>
            {expanded.has(index) ? (
              <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
          </button>

          {expanded.has(index) && (
            <div className="px-4 pb-4 space-y-3">
              {flag.category && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Category: </span>
                  <span className="text-gray-600">{flag.category}</span>
                </div>
              )}

              {showEvidence && flag.evidence && flag.evidence.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Evidence:</h5>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {flag.evidence.map((evidence, i) => (
                      <li key={i}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              )}

              {flag.fix && (
                <div className="bg-blue-50 rounded p-3">
                  <h5 className="text-sm font-semibold text-blue-900 mb-1">Recommended Fix:</h5>
                  <p className="text-sm text-blue-800">{flag.fix}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {hasMore && (
        <div className="text-center text-sm text-gray-500">
          +{flags.length - maxVisible} more red flags
        </div>
      )}
    </div>
  )
}
