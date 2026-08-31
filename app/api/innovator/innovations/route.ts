export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';
import { generateIpHash } from '@/lib/ip-timestamp';
import { requirePermission } from '@/lib/authorization';

// GET — list the innovator's own innovations (lightweight).
export async function GET(request: Request) {
  try {
    const allowed = await requirePermission('innovation.read', { entityType: 'Innovation' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const innovations = await prisma.innovation.findMany({
      where: { ownerId: allowed.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, tagline: true, sector: true, stage: true, status: true,
        fundingGoal: true, ipHash: true, ipTimestampedAt: true, submittedAt: true,
        ipProtectionLevel: true, selfAssessmentCompleted: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ innovations });
  } catch (error: any) {
    console.error('Innovations GET error:', error);
    return NextResponse.json({ error: 'Failed to load innovations' }, { status: 500 });
  }
}

// POST — create a 2-Pager Innovation Brief with IP protection fields & Tier 2 vault content.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('innovation.create', { entityType: 'Innovation' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const body = await req.json();
    const {
      title, tagline, sector, stage, summary, problem, solution,
      evidence, team, fundingGoal, fundingUse, location, submit,
      // IP & Self-Assessment
      selfAssessmentData, selfAssessmentCompleted,
      ipProtectionLevel, patentRegNumber, patentJurisdiction, openSourceLicense,
      priorDisclosure, priorDisclosureDate, thirdPartyDeps, thirdPartyDepsNote,
      // Dual-Bottom-Line
      revenueModel, impactStatement,
      // Tier 2 Vault
      technicalBlueprint, financialModelDetail, patentDocumentation, clinicalData,
    } = body ?? {};

    if (!title?.trim() || !sector?.trim() || !summary?.trim()) {
      return NextResponse.json({ error: 'Title, sector and a short summary are required.' }, { status: 400 });
    }
    if (submit && (!problem?.trim() || !solution?.trim())) {
      return NextResponse.json({ error: 'Problem and solution are required before submitting for validation.' }, { status: 400 });
    }

    const goal = Math.max(0, parseInt(String(fundingGoal ?? 0), 10) || 0);
    const validStages = ['IDEA', 'PROTOTYPE', 'PILOT', 'SCALING'];
    const stageValue = validStages.includes(stage) ? stage : 'IDEA';

    let ipHash: string | null = null;
    let ipTimestampedAt: Date | null = null;
    let submittedAt: Date | null = null;
    let declarationSignedAt: Date | null = null;
    const status = submit ? 'SUBMITTED' : 'DRAFT';
    if (submit) {
      ipTimestampedAt = new Date();
      submittedAt = ipTimestampedAt;
      declarationSignedAt = ipTimestampedAt;
      ipHash = generateIpHash({
        ownerId: session.user.id,
        title: title.trim(),
        problem: (problem ?? '').trim(),
        solution: (solution ?? '').trim(),
        evidence: (evidence ?? '').trim(),
        timestamp: ipTimestampedAt.toISOString(),
      });
    }

    const innovation = await prisma.innovation.create({
      data: {
        ownerId: session.user.id,
        title: title.trim(),
        tagline: tagline?.trim() || null,
        sector: sector.trim(),
        stage: stageValue as any,
        status: status as any,
        summary: summary.trim(),
        problem: problem?.trim() || null,
        solution: solution?.trim() || null,
        evidence: evidence?.trim() || null,
        team: team?.trim() || null,
        fundingUse: fundingUse?.trim() || null,
        fundingGoal: goal,
        location: location?.trim() || null,
        ipHash,
        ipTimestampedAt,
        submittedAt,
        // IP & Self-Assessment
        selfAssessmentData: selfAssessmentData || null,
        selfAssessmentCompleted: !!selfAssessmentCompleted,
        ipProtectionLevel: ipProtectionLevel || null,
        patentRegNumber: patentRegNumber?.trim() || null,
        patentJurisdiction: patentJurisdiction?.trim() || null,
        openSourceLicense: openSourceLicense?.trim() || null,
        priorDisclosure: !!priorDisclosure,
        priorDisclosureDate: priorDisclosureDate ? new Date(priorDisclosureDate) : null,
        thirdPartyDeps: !!thirdPartyDeps,
        thirdPartyDepsNote: thirdPartyDepsNote?.trim() || null,
        declarationSignedAt,
        // Dual-Bottom-Line
        revenueModel: revenueModel || null,
        impactStatement: impactStatement?.trim() || null,
        // Tier 2 Vault
        technicalBlueprint: technicalBlueprint?.trim() || null,
        financialModelDetail: financialModelDetail?.trim() || null,
        patentDocumentation: patentDocumentation?.trim() || null,
        clinicalData: clinicalData?.trim() || null,
      },
    });

    if (submit) {
      await enqueueInAppNotification(prisma, { userId: session.user.id, templateSlug: 'innovation.submitted', variables: { innovationTitle: innovation.title }, idempotencyKey: `innovation-submitted:${innovation.id}` });
    }

    return NextResponse.json({ innovation });
  } catch (error: any) {
    console.error('Innovation POST error:', error);
    return NextResponse.json({ error: 'Failed to save innovation' }, { status: 500 });
  }
}
