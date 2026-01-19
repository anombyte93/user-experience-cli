'use client'

import { useState } from 'react'
import { Check, Zap } from 'lucide-react'

interface Tier {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  highlighted: boolean
}

interface TierSelectorProps {
  selectedTier?: string
  onTierChange?: (tier: string) => void
  showToggle?: boolean
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'For individual developers',
    features: [
      '5 audits per month',
      'Basic UX scoring',
      'Markdown reports'
    ],
    highlighted: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10',
    period: '/month',
    description: 'For professional developers',
    features: [
      '100 audits per month',
      'Advanced UX scoring',
      'Dashboard access',
      'PDF export',
      'Priority support'
    ],
    highlighted: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large teams',
    features: [
      'Unlimited audits',
      'Custom scoring rules',
      'Team collaboration',
      'API access',
      'SSO integration',
      'Dedicated support'
    ],
    highlighted: false
  }
]

/**
 * License tier selection component
 */
export function TierSelector({
  selectedTier = 'free',
  onTierChange,
  showToggle = false
}: TierSelectorProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const handleSelect = (tierId: string) => {
    if (tierId === 'enterprise') {
      window.location.href = 'mailto:sales@user-experience.cli?subject=Enterprise Plan Inquiry'
      return
    }

    if (onTierChange) {
      onTierChange(tierId)
    }
  }

  return (
    <div className="space-y-6">
      {showToggle && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg font-medium transition relative ${
              billingPeriod === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            onClick={() => handleSelect(tier.id)}
            className={`
              relative bg-white rounded-lg shadow p-6 cursor-pointer transition
              ${tier.highlighted ? 'ring-2 ring-blue-600 scale-105' : 'hover:shadow-lg'}
              ${selectedTier === tier.id ? 'ring-2 ring-blue-600' : ''}
            `}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  Popular
                </span>
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                {tier.period && (
                  <span className="text-gray-600">{tier.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`
                w-full py-2 px-4 rounded-lg font-medium transition
                ${tier.highlighted || selectedTier === tier.id
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              {selectedTier === tier.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
