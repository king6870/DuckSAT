import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_CODES: Record<string, { plan: 'yearly'; label: string }> = {
  DUCK19: { plan: 'yearly', label: 'Tester Lifetime Access' },
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const code = (typeof body.code === 'string' ? body.code : '').trim().toUpperCase();

  if (!VALID_CODES[code]) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.isTester) {
    return NextResponse.json({ alreadyRedeemed: true, message: 'You already have tester access!' });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionPlan: 'yearly',
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date('2099-12-31T23:59:59Z'),
      isTester: true,
      promoCodeUsed: code,
      cancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({ success: true, message: 'Tester access activated! Enjoy unlimited access.' });
}
