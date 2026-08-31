export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';
import { generateIpHash } from '@/lib/ip-timestamp';

// GET — a single owned innovation (full brief).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const innovation = await prisma.innovation.findUnique({ where: { id: params.id } });
    if (!innovation || innovation.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ innovation });
  } catch (error: any) {
    console.error('Innovation GET error:', error);
    return NextResponse.json({ error: 'Failed to load innovation' }, { status: 500 });
  }
}

// PATCH — edit fields, or submit a draft into the pipeline (stamps IP), owner only.
// Editing is only allowed while the brief is still a DRAFT to preserve the integrity
// of an issued IP timestamp certificate.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.innovation.findUnique({ where: { id: params.id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const body = await req.json();
    const {
      title, tagline, sector, stage, summary, problem, solution,
      evidence, team, fundingGoal, fundingUse, location, submit,
    } = body ?? {};

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'This brief has already been submitted and can no longer be edited.' }, { status: 400 });
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (tagline !== undefined) data.tagline = tagline?.trim() || null;
    if (sector !== undefined) data.sector = sector.trim();
    if (summary !== undefined) data.summary = summary.trim();
    if (problem !== undefined) data.problem = problem?.trim() || null;
    if (solution !== undefined) data.solution = solution?.trim() || null;
    if (evidence !== undefined) data.evidence = evidence?.trim() || null;
    if (team !== undefined) data.team = team?.trim() || null;
    if (fundingUse !== undefined) data.fundingUse = fundingUse?.trim() || null;
    if (location !== undefined) data.location = location?.trim() || null;
    if (fundingGoal !== undefined) data.fundingGoal = Math.max(0, parseInt(String(fundingGoal), 10) || 0);
    const validStages = ['IDEA', 'PROTOTYPE', 'PILOT', 'SCALING'];
    if (stage !== undefined && validStages.includes(stage)) data.stage = stage;

    // IP, self-assessment & Tier 2 vault fields (editable while DRAFT)
    const {
      selfAssessmentData, selfAssessmentCompleted,
      ipProtectionLevel, patentRegNumber, patentJurisdiction, openSourceLicense,
      priorDisclosure, priorDisclosureDate, thirdPartyDeps, thirdPartyDepsNote,
      revenueModel, impactStatement,
      technicalBlueprint, financialModelDetail, patentDocumentation, clinicalData,
    } = body ?? {};
    if (selfAssessmentData !== undefined) data.selfAssessmentData = selfAssessmentData || null;
    if (selfAssessmentCompleted !== undefined) data.selfAssessmentCompleted = !!selfAssessmentCompleted;
    if (ipProtectionLevel !== undefined) data.ipProtectionLevel = ipProtectionLevel || null;
    if (patentRegNumber !== undefined) data.patentRegNumber = patentRegNumber?.trim() || null;
    if (patentJurisdiction !== undefined) data.patentJurisdiction = patentJurisdiction?.trim() || null;
    if (openSourceLicense !== undefined) data.openSourceLicense = openSourceLicense?.trim() || null;
    if (priorDisclosure !== undefined) data.priorDisclosure = !!priorDisclosure;
    if (priorDisclosureDate !== undefined) data.priorDisclosureDate = priorDisclosureDate ? new Date(priorDisclosureDate) : null;
    if (thirdPartyDeps !== undefined) data.thirdPartyDeps = !!thirdPartyDeps;
    if (thirdPartyDepsNote !== undefined) data.thirdPartyDepsNote = thirdPartyDepsNote?.trim() || null;
    if (revenueModel !== undefined) data.revenueModel = revenueModel || null;
    if (impactStatement !== undefined) data.impactStatement = impactStatement?.trim() || null;
    if (technicalBlueprint !== undefined) data.technicalBlueprint = technicalBlueprint?.trim() || null;
    if (financialModelDetail !== undefined) data.financialModelDetail = financialModelDetail?.trim() || null;
    if (patentDocumentation !== undefined) data.patentDocumentation = patentDocumentation?.trim() || null;
    if (clinicalData !== undefined) data.clinicalData = clinicalData?.trim() || null;

    if (submit) {
      const finalTitle = (data.title ?? existing.title) as string;
      const finalProblem = (data.problem ?? existing.problem ?? '') as string;
      const finalSolution = (data.solution ?? existing.solution ?? '') as string;
      const finalEvidence = (data.evidence ?? existing.evidence ?? '') as string;
      if (!finalProblem.trim() || !finalSolution.trim()) {
        return NextResponse.json({ error: 'Problem and solution are required before submitting for validation.' }, { status: 400 });
      }
      const now = new Date();
      data.status = 'SUBMITTED';
      data.submittedAt = now;
      data.ipTimestampedAt = now;
      data.ipHash = generateIpHash({
        ownerId: session.user.id,
        title: finalTitle,
        problem: finalProblem,
        solution: finalSolution,
        evidence: finalEvidence,
        timestamp: now.toISOString(),
      });
    }

    const innovation = await prisma.innovation.update({ where: { id: params.id }, data });

    if (submit) {
      await enqueueInAppNotification(prisma, { userId: session.user.id, templateSlug: 'innovation.submitted', variables: { innovationTitle: innovation.title }, idempotencyKey: `innovation-submitted:${innovation.id}` });
    }

    return NextResponse.json({ innovation });
  } catch (error: any) {
    console.error('Innovation PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update innovation' }, { status: 500 });
  }
}

// DELETE — remove an owned innovation. Only DRAFT briefs may be deleted so that
// submitted, timestamped records (and any investor activity) are preserved.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.innovation.findUnique({ where: { id: params.id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Submitted innovations cannot be deleted.' }, { status: 400 });
    }
    await prisma.innovation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Innovation DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete innovation' }, { status: 500 });
  }
}
