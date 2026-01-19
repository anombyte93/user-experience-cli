/**
 * Usage tracking and limit enforcement
 * Manages local usage data and enforces tier limits
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { UsageData, UsageCheckResult, TierType } from './types';

/**
 * Usage data directory and file paths
 */
const USAGE_DIR = path.join(os.homedir(), '.user-experience');
const USAGE_FILE = path.join(USAGE_DIR, 'usage.json');

/**
 * Ensure usage directory exists
 */
async function ensureUsageDir(): Promise<void> {
  try {
    await fs.mkdir(USAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Read usage data from local storage
 */
export async function readUsageData(): Promise<UsageData> {
  try {
    await ensureUsageDir();
    const data = await fs.readFile(USAGE_FILE, 'utf-8');
    return JSON.parse(data) as UsageData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist yet, return default usage data
      return await createDefaultUsageData();
    }
    throw error;
  }
}

/**
 * Write usage data to local storage
 */
export async function writeUsageData(data: UsageData): Promise<void> {
  await ensureUsageDir();
  await fs.writeFile(USAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Create default usage data for new users
 */
async function createDefaultUsageData(): Promise<UsageData> {
  const now = new Date().toISOString();
  const data: UsageData = {
    tier: 'free',
    currentMonth: getCurrentMonth(),
    auditsThisMonth: 0,
    totalAudits: 0,
    toolsAudited: {},
    lastAudit: null,
    createdAt: now,
    updatedAt: now,
  };
  await writeUsageData(data);
  return data;
}

/**
 * Reset monthly counters if month has changed
 */
async function resetMonthlyIfNeeded(data: UsageData): Promise<void> {
  const currentMonth = getCurrentMonth();

  if (data.currentMonth !== currentMonth) {
    // Month has changed, reset counters
    data.currentMonth = currentMonth;
    data.auditsThisMonth = 0;
    data.toolsAudited = {};
    data.updatedAt = new Date().toISOString();
    await writeUsageData(data);
  }
}

/**
 * Check if user can run another audit based on tier limits
 */
export async function checkUsageLimits(tierId: TierType, maxAudits: number): Promise<UsageCheckResult> {
  const data = await readUsageData();

  // Reset monthly counters if needed
  await resetMonthlyIfNeeded(data);

  // Read again in case it was reset
  const currentData = await readUsageData();

  const remaining = Math.max(0, maxAudits - currentData.auditsThisMonth);

  if (currentData.auditsThisMonth >= maxAudits) {
    // Limit reached
    let suggestedUpgrade: TierType = 'pro';
    if (tierId === 'pro') {
      suggestedUpgrade = 'enterprise';
    }

    return {
      allowed: false,
      tier: currentData.tier,
      used: currentData.auditsThisMonth,
      remaining: 0,
      reason: `You've reached your monthly limit of ${maxAudits} audits for the ${tierId} tier.`,
      suggestedUpgrade,
    };
  }

  return {
    allowed: true,
    tier: currentData.tier,
    used: currentData.auditsThisMonth,
    remaining,
  };
}

/**
 * Record an audit run (increment usage counters)
 */
export async function recordAudit(toolPath: string): Promise<UsageData> {
  const data = await readUsageData();

  // Reset monthly counters if needed
  await resetMonthlyIfNeeded(data);

  // Read again in case it was reset
  const currentData = await readUsageData();

  // Increment counters
  currentData.auditsThisMonth += 1;
  currentData.totalAudits += 1;
  currentData.lastAudit = new Date().toISOString();
  currentData.updatedAt = new Date().toISOString();

  // Track tools audited
  if (!currentData.toolsAudited[toolPath]) {
    currentData.toolsAudited[toolPath] = 0;
  }
  currentData.toolsAudited[toolPath] += 1;

  await writeUsageData(currentData);
  return currentData;
}

/**
 * Get usage statistics for display
 */
export async function getUsageStats(): Promise<{
  tier: TierType;
  auditsThisMonth: number;
  totalAudits: number;
  toolsAudited: number;
  lastAudit: string | null;
}> {
  const data = await readUsageData();
  await resetMonthlyIfNeeded(data);

  // Read again in case it was reset
  const currentData = await readUsageData();

  return {
    tier: currentData.tier,
    auditsThisMonth: currentData.auditsThisMonth,
    totalAudits: currentData.totalAudits,
    toolsAudited: Object.keys(currentData.toolsAudited).length,
    lastAudit: currentData.lastAudit,
  };
}

/**
 * Update user tier (called from Stripe webhook or manual override)
 */
export async function updateTier(newTier: TierType): Promise<UsageData> {
  const data = await readUsageData();
  data.tier = newTier;
  data.updatedAt = new Date().toISOString();
  await writeUsageData(data);
  return data;
}

/**
 * Manually set usage count (for admin/testing purposes)
 */
export async function setUsageCount(count: number): Promise<UsageData> {
  const data = await readUsageData();
  await resetMonthlyIfNeeded(data);

  const currentData = await readUsageData();
  currentData.auditsThisMonth = count;
  currentData.updatedAt = new Date().toISOString();
  await writeUsageData(currentData);

  return currentData;
}

/**
 * Clear all usage data (for testing/reset purposes)
 */
export async function clearUsageData(): Promise<void> {
  try {
    await fs.unlink(USAGE_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get usage data file path (for debugging)
 */
export function getUsageFilePath(): string {
  return USAGE_FILE;
}
