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
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
          const updateData: Parameters<typeof prisma.user.update>[0]['data'] = { stripeCustomerId: customerId };

          // Immediately persist subscription details so the user is activated
          // without waiting for the customer.subscription.created webhook, which
          // may arrive before or after this event (Stripe delivers them concurrently).
          const subRef = session.subscription;
          if (subRef) {
            const subId = typeof subRef === 'string' ? subRef : subRef.id;
            const sub = await stripe.subscriptions.retrieve(subId);
            const plan = (sub.metadata?.plan || session.metadata?.plan || 'monthly') as string;
            updateData.stripeSubscriptionId = sub.id;
            updateData.subscriptionPlan = plan;
            updateData.subscriptionStatus = sub.status;
            updateData.currentPeriodEnd = getSubscriptionPeriodEnd(sub);
            updateData.trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
            updateData.cancelAtPeriodEnd = sub.cancel_at_period_end;
          }

          await prisma.user.update({ where: { id: userId }, data: updateData });
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

        let user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // Fallback: checkout.session.completed may not have run yet, so look up
        // by userId from subscription metadata instead.
        if (!user && subscription.metadata?.userId) {
          user = await prisma.user.findUnique({ where: { id: subscription.metadata.userId } });
        }

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeCustomerId: customerId,
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
        const amountPaid = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0;

        // Avoid granting paid access on zero-dollar trial invoices.
        if (invoice.status !== 'paid' || amountPaid <= 0) {
          break;
        }

        if (customerId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);

          let user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });

          // Fallback: use userId from subscription metadata in case customer ID
          // hasn't been written to the DB yet by checkout.session.completed.
          if (!user && sub.metadata?.userId) {
            user = await prisma.user.findUnique({ where: { id: sub.metadata.userId } });
          }

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                stripeCustomerId: customerId,
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
