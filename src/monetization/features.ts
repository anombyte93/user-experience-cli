/**
 * Feature availability and gating by tier
 * Provides utilities to check if features are available and enforce feature gates
 */

import { getTier, tierHasFeature, getUpgradePath } from './tier';
import type { TierType } from './types';

/**
 * Check if a feature is available for the given tier
 */
export function isFeatureAvailable(
  tierId: TierType,
  feature: keyof ReturnType<typeof getTier>['features']
): boolean {
  return tierHasFeature(tierId, feature);
}

/**
 * Enforce feature availability
 * Throws an error if feature is not available, suggesting upgrade
 */
export function enforceFeatureAvailability(
  tierId: TierType,
  feature: keyof ReturnType<typeof getTier>['features'],
  featureName?: string
): void {
  if (!isFeatureAvailable(tierId, feature)) {
    const upgradeTier = getUpgradePath(tierId, feature);
    const displayName = featureName || feature;

    if (upgradeTier) {
      throw new Error(
        `The "${displayName}" feature is not available in your current tier (${tierId}). ` +
          `Please upgrade to the ${upgradeTier} tier to access this feature.`
      );
    } else {
      throw new Error(
        `The "${displayName}" feature is not available in your current tier (${tierId}).`
      );
    }
  }
}

/**
 * Get all available features for a tier
 */
export function getAvailableFeatures(tierId: TierType): string[] {
  const tier = getTier(tierId);
  return Object.entries(tier.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Get all unavailable features for a tier
 */
export function getUnavailableFeatures(tierId: TierType): string[] {
  const tier = getTier(tierId);
  return Object.entries(tier.features)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
}

/**
 * Compare two tiers and return feature differences
 */
export function compareTiers(fromTier: TierType, toTier: TierType): {
  gained: string[];
  lost: string[];
  unchanged: string[];
} {
  const from = getTier(fromTier);
  const to = getTier(toTier);

  const gained: string[] = [];
  const lost: string[] = [];
  const unchanged: string[] = [];

  for (const [feature, _] of Object.entries(from.features)) {
    const fromEnabled = from.features[feature as keyof typeof from.features];
    const toEnabled = to.features[feature as keyof typeof to.features];

    if (!fromEnabled && toEnabled) {
      gained.push(feature);
    } else if (fromEnabled && !toEnabled) {
      lost.push(feature);
    } else {
      unchanged.push(feature);
    }
  }

  return { gained, lost, unchanged };
}

/**
 * Get feature description for user-friendly display
 */
export function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    dashboard: 'Web dashboard for viewing audit history and trends',
    validation: 'AI-powered validation using doubt-agents (Phase 6)',
    pdfExport: 'Export reports as professional PDF documents',
    htmlExport: 'Export reports as interactive HTML files',
    jsonExport: 'Export raw audit data as JSON for automation',
    prioritySupport: 'Priority email and chat support',
    customBranding: 'Add your own branding to reports',
    apiAccess: 'REST API for programmatic audit execution',
    teamCollaboration: 'Share audits and collaborate with team members',
    advancedAnalytics: 'Advanced analytics and insights',
    dedicatedManager: 'Dedicated account manager',
    customIntegrations: 'Custom integrations with your tools',
  };

  return descriptions[feature] || feature;
}

/**
 * Format feature list for display (e.g., in upgrade messages)
 */
export function formatFeatureList(features: string[], indent: string = '  '): string {
  return features
    .map(feature => {
      const description = getFeatureDescription(feature);
      return `${indent}• ${description}`;
    })
    .join('\n');
}

/**
 * Generate upgrade message for a feature
 */
export function generateUpgradeMessage(
  currentTier: TierType,
  feature: keyof ReturnType<typeof getTier>['features']
): string {
  const upgradeTier = getUpgradePath(currentTier, feature);

  if (!upgradeTier) {
    return `The feature is already available in your current tier (${currentTier}).`;
  }

  const featureDesc = getFeatureDescription(feature);
  const targetTier = getTier(upgradeTier);
  const price = targetTier.monthlyPrice ? `$${targetTier.monthlyPrice}/mo` : 'Custom pricing';

  let message = `\n${'='.repeat(60)}\n`;
  message += `⬆️  UPGRADE REQUIRED: ${featureDesc.toUpperCase()}\n`;
  message += `${'='.repeat(60)}\n\n`;
  message += `This feature is available in the ${upgradeTier} tier (${price}).\n\n`;

  const comparison = compareTiers(currentTier, upgradeTier);

  if (comparison.gained.length > 0) {
    message += `By upgrading to ${upgradeTier}, you'll also gain:\n\n`;
    message += formatFeatureList(comparison.gained);
    message += `\n`;
  }

  message += `\nTo upgrade, visit: https://user-experience.dev/upgrade\n`;
  message += `${'='.repeat(60)}\n`;

  return message;
}

/**
 * Check multiple features and return summary
 */
export function checkMultipleFeatures(
  tierId: TierType,
  features: Array<keyof ReturnType<typeof getTier>['features']>
): {
  available: string[];
  unavailable: string[];
  needsUpgrade: boolean;
} {
  const available: string[] = [];
  const unavailable: string[] = [];

  for (const feature of features) {
    if (isFeatureAvailable(tierId, feature)) {
      available.push(feature);
    } else {
      unavailable.push(feature);
    }
  }

  return {
    available,
    unavailable,
    needsUpgrade: unavailable.length > 0,
  };
}
