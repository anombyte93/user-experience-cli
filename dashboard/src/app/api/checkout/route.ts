/**
 * Stripe checkout API endpoint
 * Creates checkout sessions for subscription upgrades
 */

import { NextRequest, NextResponse } from 'next/server';

// Stripe price IDs (configure in Stripe Dashboard)
const PRICES: Record<string, Record<string, string>> = {
  monthly: {
    pro: 'price_pro_monthly', // Replace with actual Stripe price ID
    enterprise: 'price_ent_monthly'
  },
  yearly: {
    pro: 'price_pro_yearly', // Replace with actual Stripe price ID
    enterprise: 'price_ent_yearly'
  }
};

export async function POST(request: NextRequest) {
  try {
    const { tierId, billingPeriod = 'monthly' } = await request.json();

    // Validate tier
    if (!['pro', 'enterprise'].includes(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Get Stripe API key from environment
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Get price ID
    const priceId = PRICES[billingPeriod]?.[tierId];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      );
    }

    // In production, use Stripe SDK to create checkout session:
    // const stripe = require('stripe')(stripeKey);
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{
    //     price: priceId,
    //     quantity: 1
    //   }],
    //   success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`
    // });

    // For now, return mock URL
    const mockSessionUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/success?tier=${tierId}`;

    return NextResponse.json({
      url: mockSessionUrl
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
