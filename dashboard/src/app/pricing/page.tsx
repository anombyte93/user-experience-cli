/**
 * Pricing page for monetization
 * Displays tiers and handles upgrades via Stripe
 */

'use client';

import { useState } from 'react';
import { Check, Zap, Shield, TrendingUp } from 'lucide-react';
import { Header } from '@/components/header';

interface Tier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'For individual developers and open source projects',
    features: [
      '5 audits per month',
      'Basic UX scoring',
      'Markdown reports',
      'Community support'
    ],
    cta: 'Get Started',
    highlighted: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10',
    period: '/month',
    description: 'For professional developers and small teams',
    features: [
      '100 audits per month',
      'Advanced UX scoring',
      'Dashboard access',
      'Doubt-agent validation',
      'PDF report export',
      'Priority support'
    ],
    cta: 'Start Free Trial',
    highlighted: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large teams and organizations',
    features: [
      'Unlimited audits',
      'Custom scoring rules',
      'Team collaboration',
      'SSO integration',
      'API access',
      'Dedicated support',
      'SLA guarantee'
    ],
    cta: 'Contact Sales',
    highlighted: false
  }
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'enterprise') {
      // Open contact form
      window.location.href = 'mailto:sales@user-experience.cli?subject=Enterprise Plan Inquiry';
      return;
    }

    // Redirect to Stripe checkout
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          billingPeriod
        })
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your needs
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition relative ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl shadow-lg p-8 ${
                tier.highlighted ? 'ring-4 ring-blue-600 scale-105' : ''
              }`}
            >
              {tier.highlighted && (
                <div className="text-center mb-4">
                  <span className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-gray-600">{tier.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
                  tier.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow">
            <Shield className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-600">
              Powered by Stripe. Your payment information is never stored on our servers.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <TrendingUp className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cancel Anytime</h3>
            <p className="text-gray-600">
              No long-term contracts. Upgrade or downgrade your plan at any time.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <Zap className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Instant Activation</h3>
            <p className="text-gray-600">
              Get immediate access to all features when you upgrade. No waiting period.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                What happens when I exceed my audit limit?
              </summary>
              <p className="mt-4 text-gray-600">
                You'll be notified when you approach your limit. You can upgrade to a higher tier
                or wait for your monthly quota to reset.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                Can I switch between plans?
              </summary>
              <p className="mt-4 text-gray-600">
                Yes! You can upgrade or downgrade at any time. When upgrading, you'll get
                immediate access to new features. When downgrading, changes take effect at the
                next billing cycle.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                Do you offer refunds?
              </summary>
              <p className="mt-4 text-gray-600">
                We offer a 14-day money-back guarantee. If you're not satisfied, contact
                support for a full refund.
              </p>
            </details>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
