import { getGrade, getGradeColor, getScoreColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  grade?: string
  size?: 'sm' | 'md' | 'lg'
  showGrade?: boolean
}

/**
 * Visual score indicator with color coding
 */
export function ScoreBadge({
  score,
  grade,
  size = 'md',
  showGrade = true
}: ScoreBadgeProps) {
  const calculatedGrade = grade || getGrade(score)
  const gradeColor = getGradeColor(calculatedGrade)
  const scoreColor = getScoreColor(score)

  const sizes = {
    sm: {
      score: 'text-2xl',
      grade: 'text-xs px-2 py-0.5',
      container: 'p-3'
    },
    md: {
      score: 'text-3xl',
      grade: 'text-sm px-3 py-1',
      container: 'p-4'
    },
    lg: {
      score: 'text-4xl',
      grade: 'text-base px-4 py-2',
      container: 'p-6'
    }
  }

  const sizeClasses = sizes[size]

  return (
    <div className={cn('flex items-center gap-3', sizeClasses.container)}>
      <div className="text-center">
        <div className={cn('font-bold', scoreColor, sizeClasses.score)}>
          {score.toFixed(1)}
        </div>
        {showGrade && (
          <div className={cn(
            'inline-block rounded-full font-semibold mt-1',
            gradeColor,
            sizeClasses.grade
          )}>
            {calculatedGrade}
          </div>
        )}
      </div>
    </div>
  )
}
