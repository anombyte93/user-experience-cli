/**
 * Stripe webhook handler for payment processing
 * Handles subscription.created, subscription.updated, and invoice.paid events
 */
import crypto from 'crypto';
/** Stripe webhook secret (set via environment variable) */
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
/** Product price IDs to tiers mapping */
const PRICE_TO_TIER = {
    // Pro tier price IDs
    'price_pro_monthly': 'pro',
    'price_pro_yearly': 'pro',
    // Enterprise tier price IDs
    'price_ent_monthly': 'enterprise',
    'price_ent_yearly': 'enterprise'
};
/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(payload, signature) {
    if (!WEBHOOK_SECRET) {
        console.warn('STRIPE_WEBHOOK_SECRET not set, skipping verification');
        return true; // Allow in development
    }
    try {
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = hmac.update(payload).digest('hex');
        const expectedSignature = `t=${digest}`;
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    catch {
        return false;
    }
}
/**
 * Handle Stripe webhook event
 */
export async function handleStripeWebhook(event) {
    try {
        switch (event.type) {
            case 'subscription.created':
            case 'subscription.updated': {
                const subscription = event.data.object;
                if (subscription.status !== 'active') {
                    return { received: true, processed: false, error: 'Subscription not active' };
                }
                // Determine tier from price ID
                const priceId = subscription.items?.data[0]?.price.id;
                const tier = priceId ? PRICE_TO_TIER[priceId] : null;
                if (!tier) {
                    return { received: true, processed: false, error: 'Unknown price ID' };
                }
                // Generate license key
                const licenseKey = await generateLicenseForSubscription(subscription.id, tier);
                // Activate license
                const { activateLicense } = await import('../monetization/license.js');
                const email = subscription.customer_email || 'customer@example.com';
                await activateLicense(licenseKey, email);
                const { getCurrentLicense } = await import('../monetization/license.js');
                const license = await getCurrentLicense();
                return { received: true, processed: true, license: license || undefined };
            }
            case 'invoice.paid': {
                // Invoice paid - subscription renewed
                // Could extend expiration date here
                return { received: true, processed: true };
            }
            case 'subscription.deleted': {
                // Subscription cancelled - revoke license
                // Could set expiresAt to past or delete license file
                return { received: true, processed: true };
            }
            default:
                return { received: true, processed: false, error: 'Unhandled event type' };
        }
    }
    catch (error) {
        return {
            received: true,
            processed: false,
            error: error.message
        };
    }
}
/**
 * Generate license key for Stripe subscription
 */
async function generateLicenseForSubscription(subscriptionId, tier) {
    const crypto = await import('crypto');
    // Generate deterministic key from subscription ID
    const hash = crypto
        .createHash('sha256')
        .update(subscriptionId)
        .digest('hex')
        .toUpperCase();
    const parts = [
        tier.toUpperCase(),
        hash.slice(0, 3),
        hash.slice(3, 6),
        hash.slice(6, 9)
    ];
    return parts.join('-');
}
/**
 * Express middleware for Stripe webhooks
 */
export function stripeWebhookMiddleware(req, res, next) {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'No signature provided' });
    }
    const payload = JSON.stringify(req.body);
    if (!verifyStripeSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    req.stripeEvent = JSON.parse(payload);
    next();
}
//# sourceMappingURL=stripe-webhook.js.map