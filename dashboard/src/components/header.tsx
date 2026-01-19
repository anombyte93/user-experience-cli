'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Home, FileText, DollarSign, Settings, User } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Navigation header component
 */
export function Header() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">UX Audit</h1>
              <p className="text-xs text-gray-500">User Experience Dashboard</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Free Tier</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
