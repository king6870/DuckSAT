import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPromoCodeDefinition } from '@/lib/promo-code-store';

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
  const definition = await getPromoCodeDefinition(code)

  if (!definition) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.promoCodeUsed) {
    return NextResponse.json({
      alreadyRedeemed: true,
      message: `You already redeemed promo code ${user.promoCodeUsed}.`,
    });
  }

  if (definition.effectType === 'tester_access') {
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

    return NextResponse.json({ success: true, message: definition.successMessage });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      bonusPracticeTests: { increment: definition.bonusPracticeTests ?? 0 },
      promoCodeUsed: code,
    },
  })

  return NextResponse.json({ success: true, message: definition.successMessage });
}
