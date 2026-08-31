export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveFeedbackTier } from '@/lib/feedback-weight';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const {
      productName, productSize, isOnPlatform, innovationId,
      rating, comment, evidenceUrl, province, country, reporterEmail,
    } = body;

    if (!productName || !rating) {
      return NextResponse.json({ error: 'Product name and rating are required' }, { status: 400 });
    }

    // Check if user is an expert (PRACTITIONER role)
    const isExpert = session?.user?.role === 'PRACTITIONER';
    const hasComment = !!(comment && comment.trim());
    // Only experts may attach evidence
    const hasEvidence = isExpert && !!(evidenceUrl && evidenceUrl.trim());

    const tier = resolveFeedbackTier({ isExpert, hasComment, hasEvidence });

    const feedback = await prisma.productFeedback.create({
      data: {
        reviewerId: session?.user?.id ?? null,
        productName,
        productSize: productSize || null,
        isOnPlatform: isOnPlatform === true || isOnPlatform === 'true',
        innovationId: innovationId || null,
        rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
        comment: hasComment ? comment.trim() : null,
        isExpertReview: isExpert,
        hasEvidence,
        evidenceUrl: hasEvidence ? evidenceUrl.trim() : null,
        feedbackTier: tier.tier,
        expertWeight: tier.weight,
        reporterEmail: (typeof reporterEmail === 'string' && reporterEmail.trim()) ? reporterEmail.trim() : null,
        province: province || null,
        country: country || 'Kenya',
      },
    });

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (err) {
    console.error('Product feedback error:', err);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role !== 'ADMIN' && role !== 'POLICYMAKER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const productName = searchParams.get('product');
    const limit = 20;

    const where = productName ? { productName: { contains: productName, mode: 'insensitive' as const } } : {};

    const [feedback, total] = await Promise.all([
      prisma.productFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { reviewer: { select: { name: true, role: true } } },
      }),
      prisma.productFeedback.count({ where }),
    ]);

    // Calculate weighted average if filtering by product
    let weightedAvg = null;
    if (productName) {
      const allForProduct = await prisma.productFeedback.findMany({
        where,
        select: { rating: true, expertWeight: true },
      });
      if (allForProduct.length > 0) {
        const totalWeight = allForProduct.reduce((sum, f) => sum + f.expertWeight, 0);
        const weightedSum = allForProduct.reduce((sum, f) => sum + f.rating * f.expertWeight, 0);
        weightedAvg = Math.round((weightedSum / totalWeight) * 10) / 10;
      }
    }

    return NextResponse.json({ feedback, total, page, pages: Math.ceil(total / limit), weightedAvg });
  } catch (err) {
    console.error('Product feedback fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
