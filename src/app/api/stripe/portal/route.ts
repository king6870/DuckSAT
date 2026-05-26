import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { assertStripeRuntimeConfig } from '@/lib/stripe-env';
import { resolveStripeCustomerId } from '@/lib/stripe-customer';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    assertStripeRuntimeConfig('Stripe Portal')

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.ducksat.com';

    const customerId = await resolveStripeCustomerId({
      context: 'Stripe Portal',
      userId: session.user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
    });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
