export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeMatchScore } from '@/lib/match-scoring';

const TIER2_FIELDS = ['technicalBlueprint', 'financialModelDetail', 'patentDocumentation', 'clinicalData'] as const;

// Deal Room: full detail for a single innovation, incl. due diligence and milestone funding.
// Tier 2 fields are stripped unless the investor has an APPROVED VaultAccessRequest.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const innovation = await prisma.innovation.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { name: true, organization: true, bio: true, paxId: true } },
        milestones: { orderBy: { orderIndex: 'asc' } },
        diligenceItems: { orderBy: { createdAt: 'asc' } },
        endorsements: {
          orderBy: { createdAt: 'desc' },
          include: { endorser: { select: { name: true, organization: true } } },
        },
        cashFlows: { orderBy: { date: 'asc' } },
        investments: {
          where: { investorId: session.user.id },
        },
      },
    });

    if (!innovation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check vault access for the requesting investor
    const vaultAccess = await prisma.vaultAccessRequest.findUnique({
      where: {
        innovationId_requesterId: {
          innovationId: params.id,
          requesterId: session.user.id,
        },
      },
      select: { status: true },
    });
    const vaultApproved = vaultAccess?.status === 'APPROVED';
    const vaultDocuments = vaultApproved
      ? await prisma.vaultDocument.findMany({ where: { innovationId: params.id, active: true, asset: { status: 'CLEAN' } }, select: { id: true, title: true, description: true, assetId: true, createdAt: true }, orderBy: { createdAt: 'desc' } })
      : [];

    // Build safe response — strip Tier 2 if not approved
    const safeInnovation: any = { ...innovation };
    if (!vaultApproved) {
      TIER2_FIELDS.forEach((f) => {
        // Indicate presence but don't expose content
        safeInnovation[f] = safeInnovation[f] ? '__LOCKED__' : null;
      });
    }

    // Neural Matchmaking: score this opportunity against the investor's mandate.
    const mandate = await prisma.investorMandate.findUnique({
      where: { userId: session.user.id },
    });
    let match: { score: number; reasons: string[]; gaps: string[] } | null = null;
    if (mandate) {
      match = computeMatchScore(mandate, innovation);
    }

    // De-risked due-diligence: surface published Debate Hub consensus proof linked to
    // this innovation (independent, evidence-based validation from health stakeholders).
    const fieldValidation = await prisma.debate.findMany({
      where: {
        relatedInnovationId: params.id,
        consensusPublishedAt: { not: null },
      },
      orderBy: { consensusPublishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        consensusAbstract: true,
        feasibilityConsensus: true,
        consensusPublishedAt: true,
      },
    });

    const myInvestment = innovation.investments[0] ?? null;
    return NextResponse.json({
      innovation: safeInnovation,
      myInvestment,
      vaultAccess: vaultAccess?.status || null,
      vaultDocuments,
      match,
      hasMandate: !!mandate,
      fieldValidation,
    });
  } catch (error: any) {
    console.error('Deal room error:', error);
    return NextResponse.json({ error: 'Failed to load deal room' }, { status: 500 });
  }
}
