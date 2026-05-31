import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { assertStripeRuntimeConfig } from '@/lib/stripe-env';
import {
  formatLifecycleDate,
  LIFECYCLE_EVENT_NAMES,
  recordLifecycleAutomationEvent,
} from '@/lib/lifecycle-email-events';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  // In Stripe SDK v20+, current_period_end is on items, not the subscription root
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  // Fallback: use start_date + 30 days
  return new Date(subscription.start_date * 1000 + 30 * 24 * 60 * 60 * 1000);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // In Stripe SDK v20+, subscription is under parent.subscription_details
  const parent = invoice.parent;
  if (parent?.type === 'subscription_details' && parent.subscription_details?.subscription) {
    const sub = parent.subscription_details.subscription;
    return typeof sub === 'string' ? sub : sub.id;
  }
  return null;
}

export async function POST(request: Request) {
  assertStripeRuntimeConfig('Stripe Webhook', { requireWebhookSecret: true })

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.customer) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: session.customer as string },
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = subscription.metadata?.plan || 'monthly';
        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionPlan: plan as string,
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          if (event.type === 'customer.subscription.created') {
            try {
              await recordLifecycleAutomationEvent({
                userId: user.id,
                eventName: LIFECYCLE_EVENT_NAMES.premiumSubscriptionPurchased,
                triggerKey: `${LIFECYCLE_EVENT_NAMES.premiumSubscriptionPurchased}:${subscription.id}`,
                metadata: {
                  billingPlan: plan,
                  subscriptionPlan: plan,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: formatLifecycleDate(currentPeriodEnd),
                },
                pagePath: '/pricing',
              });
            } catch (automationError) {
              console.error('[Stripe Webhook] purchase lifecycle automation error:', automationError);
            }
          }

          if (event.type === 'customer.subscription.updated' && subscription.cancel_at_period_end && !user.cancelAtPeriodEnd) {
            try {
              await recordLifecycleAutomationEvent({
                userId: user.id,
                eventName: LIFECYCLE_EVENT_NAMES.subscriptionCancellationRequested,
                triggerKey: `${LIFECYCLE_EVENT_NAMES.subscriptionCancellationRequested}:${subscription.id}`,
                metadata: {
                  billingPlan: plan,
                  subscriptionPlan: plan,
                  accessEndsOn: formatLifecycleDate(currentPeriodEnd),
                },
                pagePath: '/pricing',
              });
            } catch (automationError) {
              console.error('[Stripe Webhook] cancellation lifecycle automation error:', automationError);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionPlan: 'free',
              subscriptionStatus: 'none',
              stripeSubscriptionId: null,
              currentPeriodEnd: null,
              trialEnd: null,
              cancelAtPeriodEnd: false,
            },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        const subId = getInvoiceSubscriptionId(invoice);

        if (customerId && subId) {
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            const sub = await stripe.subscriptions.retrieve(subId);
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: 'active',
                currentPeriodEnd: getSubscriptionPeriodEnd(sub),
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId) {
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: 'past_due' },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
