import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to human-readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Calculate grade from score
 */
export function getGrade(score: number): string {
  if (score >= 9) return 'A+'
  if (score >= 8) return 'A'
  if (score >= 7) return 'B'
  if (score >= 6) return 'C'
  if (score >= 4) return 'D'
  return 'F'
}

/**
 * Get color class for grade
 */
export function getGradeColor(grade: string): string {
  const colors = {
    'A+': 'bg-green-100 text-green-800',
    'A': 'bg-green-100 text-green-800',
    'B': 'bg-blue-100 text-blue-800',
    'C': 'bg-yellow-100 text-yellow-800',
    'D': 'bg-orange-100 text-orange-800',
    'F': 'bg-red-100 text-red-800'
  }
  return colors[grade as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

/**
 * Get color class for severity
 */
export function getSeverityColor(severity: string): string {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  }
  return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

/**
 * Get color for score (0-10)
 */
export function getScoreColor(score: number): string {
  if (score >= 9) return 'text-green-600'
  if (score >= 8) return 'text-green-500'
  if (score >= 7) return 'text-blue-600'
  if (score >= 6) return 'text-yellow-600'
  if (score >= 4) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
