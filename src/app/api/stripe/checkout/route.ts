import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { STRIPE_PLANS } from '@/lib/stripe-config';
import { assertStripeRuntimeConfig } from '@/lib/stripe-env';
import { resolveStripeCustomerId } from '@/lib/stripe-customer';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    assertStripeRuntimeConfig('Stripe Checkout', {
      requirePriceIds: true,
      requirePublishableKey: true,
    })

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body as { plan: 'monthly' | 'yearly' };

    if (plan !== 'monthly' && plan !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = STRIPE_PLANS[plan];
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const customerId = await resolveStripeCustomerId({
      context: 'Stripe Checkout',
      userId: session.user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.ducksat.com';

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      subscription_data: planConfig.trialDays > 0
        ? { trial_period_days: planConfig.trialDays, metadata: { userId: session.user.id, plan } }
        : { metadata: { userId: session.user.id, plan } },
      success_url: `${baseUrl}/dashboard?subscribed=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: { userId: session.user.id, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
