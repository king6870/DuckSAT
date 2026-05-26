import Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

interface ResolveStripeCustomerInput {
  context: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  stripeCustomerId?: string | null;
}

function isDeletedCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): customer is Stripe.DeletedCustomer {
  return 'deleted' in customer ? customer.deleted === true : false;
}

function isMissingCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const stripeError = error as {
    code?: string;
    param?: string;
    message?: string;
    raw?: { code?: string; param?: string; message?: string };
  };

  const code = stripeError.code ?? stripeError.raw?.code;
  const param = stripeError.param ?? stripeError.raw?.param;
  const message = stripeError.message ?? stripeError.raw?.message ?? '';

  return (code === 'resource_missing' && param === 'customer') || message.includes('No such customer');
}

async function createAndPersistStripeCustomer({
  context,
  userId,
  email,
  name,
  stripeCustomerId,
}: ResolveStripeCustomerInput): Promise<string> {
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  console.info('[Stripe Customer] Created customer for request recovery.', {
    context,
    userId,
    hadStoredCustomerId: Boolean(stripeCustomerId),
  });

  return customer.id;
}

export async function resolveStripeCustomerId(input: ResolveStripeCustomerInput): Promise<string> {
  const { context, userId, stripeCustomerId } = input;

  if (!stripeCustomerId) {
    return createAndPersistStripeCustomer(input);
  }

  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!isDeletedCustomer(customer)) {
      return customer.id;
    }

    console.warn('[Stripe Customer] Stored customer is deleted. Recreating live customer.', {
      context,
      userId,
    });
  } catch (error) {
    if (!isMissingCustomerError(error)) {
      throw error;
    }

    console.warn('[Stripe Customer] Stored customer is missing in Stripe. Recreating live customer.', {
      context,
      userId,
    });
  }

  return createAndPersistStripeCustomer(input);
}