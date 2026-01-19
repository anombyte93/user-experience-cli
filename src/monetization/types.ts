/**
 * Monetization and tier system type definitions
 */

/**
 * License tier types
 */
export type TierType = 'free' | 'pro' | 'enterprise';

/**
 * Feature flags available in different tiers
 */
export interface FeatureFlags {
  /** Access to web dashboard */
  dashboard: boolean;
  /** Run doubt-agent validation (Phase 6) */
  validation: boolean;
  /** Export reports as PDF */
  pdfExport: boolean;
  /** Export reports as HTML */
  htmlExport: boolean;
  /** Export raw JSON data */
  jsonExport: boolean;
  /** Priority support queue */
  prioritySupport: boolean;
  /** Custom branding on reports */
  customBranding: boolean;
  /** API access for automation */
  apiAccess: boolean;
  /** Team collaboration features */
  teamCollaboration: boolean;
  /** Advanced analytics */
  advancedAnalytics: boolean;
  /** Dedicated account manager */
  dedicatedManager: boolean;
  /** Custom integrations */
  customIntegrations: boolean;
}

/**
 * Usage limits per tier
 */
export interface UsageLimits {
  /** Maximum audits per month */
  maxAuditsPerMonth: number;
  /** Maximum tools that can be audited */
  maxTools: number;
  /** Maximum report retention days */
  maxRetentionDays: number;
  /** Maximum team members */
  maxTeamMembers: number;
  /** Maximum API calls per month */
  maxApiCallsPerMonth: number;
}

/**
 * User usage data tracked locally
 */
export interface UsageData {
  /** User's current tier */
  tier: TierType;
  /** Current month (YYYY-MM format) */
  currentMonth: string;
  /** Number of audits run this month */
  auditsThisMonth: number;
  /** Total audits ever run */
  totalAudits: number;
  /** Tools audited (map of tool path to audit count) */
  toolsAudited: Record<string, number>;
  /** Last audit timestamp */
  lastAudit: string | null;
  /** Timestamp when this record was created */
  createdAt: string;
  /** Timestamp when this record was last updated */
  updatedAt: string;
}

/**
 * Tier configuration
 */
export interface TierConfig {
  /** Tier identifier */
  id: TierType;
  /** Display name */
  name: string;
  /** Monthly price in USD (null for enterprise/custom) */
  monthlyPrice: number | null;
  /** Yearly price in USD (null for enterprise/custom) */
  yearlyPrice: number | null;
  /** Feature flags for this tier */
  features: FeatureFlags;
  /** Usage limits */
  limits: UsageLimits;
  /** Description of tier */
  description: string;
}

/**
 * Usage check result
 */
export interface UsageCheckResult {
  /** Whether the user can proceed with the audit */
  allowed: boolean;
  /** Current tier */
  tier: TierType;
  /** Audits used this month */
  used: number;
  /** Audits remaining this month */
  remaining: number;
  /** Reason if not allowed */
  reason?: string;
  /** Suggested upgrade tier if limit hit */
  suggestedUpgrade?: TierType;
}

/**
 * Stripe webhook event types
 */
export type StripeEventType = 'checkout.session.completed' | 'customer.subscription.updated' | 'customer.subscription.deleted';

/**
 * Stripe webhook payload (simplified)
 */
export interface StripeWebhookEvent {
  /** Event type */
  type: StripeEventType;
  /** Event ID */
  id: string;
  /** Event data */
  data: {
    /** Object containing the relevant resource */
    object: {
      /** Customer email */
      customer_email?: string;
      /** Subscription ID */
      subscription?: string;
      /** Metadata */
      metadata?: Record<string, string>;
      /** Status */
      status?: string;
    };
  };
}

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';

/**
 * User subscription data
 */
export interface SubscriptionData {
  /** Stripe subscription ID */
  subscriptionId: string;
  /** Current status */
  status: SubscriptionStatus;
  /** Tier this subscription provides */
  tier: TierType;
  /** Billing period (monthly or yearly) */
  billingPeriod: 'monthly' | 'yearly';
  /** Current period start */
  currentPeriodStart: string;
  /** Current period end */
  currentPeriodEnd: string;
  /** Cancel at period end */
  cancelAtPeriodEnd: boolean;
}
