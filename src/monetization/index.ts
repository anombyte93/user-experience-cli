/**
 * Monetization system exports
 * Provides tier management, usage tracking, and feature gating
 */

// Type definitions
export type * from './types.js';

// Tier management
export {
  getTier,
  getAllTiers,
  getTierForFeature,
  tierHasFeature,
  getUpgradePath,
  formatPrice,
  getYearlySavings,
  TIERS
} from './tier.js';

// Usage tracking and limits
export {
  readUsageData,
  writeUsageData,
  checkUsageLimits,
  recordAudit,
  getUsageStats,
  updateTier,
  setUsageCount,
  clearUsageData,
  getUsageFilePath
} from './limits.js';

// Feature availability and gating
export {
  isFeatureAvailable,
  enforceFeatureAvailability,
  getAvailableFeatures,
  getUnavailableFeatures,
  compareTiers,
  getFeatureDescription,
  formatFeatureList,
  generateUpgradeMessage,
  checkMultipleFeatures
} from './features.js';

// License management (already exists)
export {
  validateLicense,
  activateLicense,
  checkFeatureAvailability,
  trackAuditUsage,
  hasRemainingAudits,
  getCurrentLicense,
  generateLicenseKey
} from './license.js';
