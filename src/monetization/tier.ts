/**
 * Tier definitions and configuration
 * Defines the three license tiers: Free, Pro, and Enterprise
 */

import type { TierConfig, TierType } from './types';

/**
 * Free tier configuration
 * - 5 audits per month
 * - Basic CLI usage only
 * - No dashboard or validation
 */
const FREE_TIER: TierConfig = {
  id: 'free',
  name: 'Free',
  monthlyPrice: 0,
  yearlyPrice: 0,
  description: 'Perfect for trying out the user-experience auditor',
  features: {
    dashboard: false,
    validation: false,
    pdfExport: false,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    teamCollaboration: false,
    advancedAnalytics: false,
    dedicatedManager: false,
    customIntegrations: false,
  },
  limits: {
    maxAuditsPerMonth: 5,
    maxTools: 3,
    maxRetentionDays: 30,
    maxTeamMembers: 1,
    maxApiCallsPerMonth: 0,
  },
};

/**
 * Pro tier configuration
 * - 100 audits per month
 * - Full feature access including dashboard and validation
 * - Priority support
 */
const PRO_TIER: TierConfig = {
  id: 'pro',
  name: 'Pro',
  monthlyPrice: 10,
  yearlyPrice: 100, // ~2 months free
  description: 'For developers and teams serious about UX quality',
  features: {
    dashboard: true,
    validation: true,
    pdfExport: true,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: true,
    customBranding: false,
    apiAccess: true,
    teamCollaboration: false,
    advancedAnalytics: true,
    dedicatedManager: false,
    customIntegrations: false,
  },
  limits: {
    maxAuditsPerMonth: 100,
    maxTools: 50,
    maxRetentionDays: 365,
    maxTeamMembers: 5,
    maxApiCallsPerMonth: 1000,
  },
};

/**
 * Enterprise tier configuration
 * - Unlimited audits
 * - All features plus dedicated support
 * - Custom integrations and SLA
 */
const ENTERPRISE_TIER: TierConfig = {
  id: 'enterprise',
  name: 'Enterprise',
  monthlyPrice: null, // Custom pricing
  yearlyPrice: null,
  description: 'For organizations with advanced needs and high volume',
  features: {
    dashboard: true,
    validation: true,
    pdfExport: true,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    teamCollaboration: true,
    advancedAnalytics: true,
    dedicatedManager: true,
    customIntegrations: true,
  },
  limits: {
    maxAuditsPerMonth: Infinity,
    maxTools: Infinity,
    maxRetentionDays: Infinity,
    maxTeamMembers: Infinity,
    maxApiCallsPerMonth: Infinity,
  },
};

/**
 * Tier registry
 */
export const TIERS: Record<TierType, TierConfig> = {
  free: FREE_TIER,
  pro: PRO_TIER,
  enterprise: ENTERPRISE_TIER,
};

/**
 * Get tier configuration by ID
 */
export function getTier(tierId: TierType): TierConfig {
  const tier = TIERS[tierId];
  if (!tier) {
    throw new Error(`Unknown tier: ${tierId}`);
  }
  return tier;
}

/**
 * Get all available tiers
 */
export function getAllTiers(): TierConfig[] {
  return Object.values(TIERS);
}

/**
 * Get tier by feature requirement
 * Returns the minimum tier required for a given feature
 */
export function getTierForFeature(feature: keyof TierConfig['features']): TierType {
  if (feature === 'dashboard' || feature === 'validation' || feature === 'pdfExport') {
    return 'pro';
  }
  if (feature === 'customBranding' || feature === 'teamCollaboration' || feature === 'dedicatedManager') {
    return 'enterprise';
  }
  return 'free';
}

/**
 * Check if a tier has a specific feature
 */
export function tierHasFeature(tierId: TierType, feature: keyof TierConfig['features']): boolean {
  const tier = getTier(tierId);
  return tier.features[feature];
}

/**
 * Get upgrade path from one tier to another
 * Returns the tier to upgrade to for a feature
 */
export function getUpgradePath(fromTier: TierType, feature: keyof TierConfig['features']): TierType | null {
  const currentTier = getTier(fromTier);

  // If current tier already has the feature, no upgrade needed
  if (currentTier.features[feature]) {
    return null;
  }

  // Find the minimum tier that has this feature
  return getTierForFeature(feature);
}

/**
 * Format price for display
 */
export function formatPrice(tierId: TierType, billingPeriod: 'monthly' | 'yearly' = 'monthly'): string {
  const tier = getTier(tierId);
  const price = billingPeriod === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;

  if (price === null) {
    return 'Custom pricing';
  }

  if (price === 0) {
    return 'Free';
  }

  return `$${price}/${billingPeriod === 'monthly' ? 'mo' : 'yr'}`;
}

/**
 * Get savings percentage for yearly billing
 */
export function getYearlySavings(tierId: TierType): number {
  const tier = getTier(tierId);
  if (tier.monthlyPrice === null || tier.yearlyPrice === null) {
    return 0;
  }

  const yearlyMonthlyCost = tier.monthlyPrice * 12;
  const savings = yearlyMonthlyCost - tier.yearlyPrice;
  const savingsPercent = Math.round((savings / yearlyMonthlyCost) * 100);

  return savingsPercent;
}
