/**
 * Stripe webhook handler for payment processing
 * Handles subscription.created, subscription.updated, and invoice.paid events
 */
import type { License } from '../monetization/license.js';
export interface StripeWebhookEvent {
    id: string;
    type: string;
    data: {
        object: {
            id: string;
            customer_email?: string;
            status?: string;
            current_period_end?: number;
            items?: {
                data: Array<{
                    price: {
                        id: string;
                        nickname?: string;
                    };
                }>;
            };
        };
    };
}
export interface StripeWebhookResponse {
    received: boolean;
    processed: boolean;
    license?: License;
    error?: string;
}
/**
 * Verify Stripe webhook signature
 */
export declare function verifyStripeSignature(payload: string, signature: string): boolean;
/**
 * Handle Stripe webhook event
 */
export declare function handleStripeWebhook(event: StripeWebhookEvent): Promise<StripeWebhookResponse>;
/**
 * Express middleware for Stripe webhooks
 */
export declare function stripeWebhookMiddleware(req: any, res: any, next: any): any;
//# sourceMappingURL=stripe-webhook.d.ts.map