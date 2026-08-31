export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { generateConsensusBrief } from '@/lib/consensus-brief';
import { getBriefAccess } from '@/lib/brief-access';

function esc(v: string | null | undefined): string {
  return (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function md2html(md: string): string {
  // Simple markdown to html for the PDF
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(?:<br\/>)?)+/g, (m) => `<ul>${m.replace(/<br\/>/g, '')}</ul>`);
  return `<p>${html}</p>`;
}

// POST — Generate (or regenerate) a consensus brief draft via LLM (admin only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin('knowledge.brief.manage');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const debate = await prisma.debate.findUnique({
    where: { id: params.id },
    include: {
      contributions: {
        where: { moderationStatus: { not: 'REMOVED' } },
        include: { author: { select: { role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      stances: true,
    },
  });
  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build stance distribution
  const distribution: Record<string, number> = {};
  debate.stances.forEach((s) => {
    distribution[s.reaction] = (distribution[s.reaction] || 0) + 1;
  });

  // Feasibility avg
  const feasScores = debate.contributions.filter((c) => c.feasibilityScore != null).map((c) => c.feasibilityScore!);
  const feasAvg = feasScores.length > 0 ? feasScores.reduce((a, b) => a + b, 0) / feasScores.length : null;

  // Community score
  const pos = (distribution['AGREE'] ?? 0) + (distribution['RELEVANT_MY_SETTING'] ?? 0) + 0.5 * (distribution['PARTLY_AGREE'] ?? 0);
  const neg = (distribution['DISAGREE'] ?? 0) + (distribution['NOT_FEASIBLE_MY_SETTING'] ?? 0);
  const total = pos + neg;
  const sentiment = total > 0 ? pos / total : 0.5;
  const feas = feasAvg != null ? feasAvg / 5 : sentiment;
  const communityScore = Math.round((sentiment * 0.6 + feas * 0.4) * 100);

  try {
    const brief = await generateConsensusBrief({
      title: debate.title,
      motion: debate.motion,
      type: debate.type,
      healthDomain: debate.healthDomain,
      geographyFocus: debate.geographyFocus,
      problemStatement: debate.problemStatement,
      anchorReference: debate.anchorReference,
      standardRecommendation: debate.standardRecommendation,
      contributions: debate.contributions.map((c) => ({
        body: c.body,
        dimension: c.dimension,
        feasibilityScore: c.feasibilityScore,
        implementationSetting: c.implementationSetting,
        isExpert: c.isExpert,
        isDevilsAdvocate: c.isDevilsAdvocate,
        authorRole: c.author?.role || 'MEMBER',
      })),
      stanceDistribution: distribution,
      feasibilityAvg: feasAvg,
      communityScore,
    });

    // Save draft — NOT published yet (consensusPublishedAt stays null until admin publishes)
    await prisma.debate.update({
      where: { id: params.id },
      data: {
        consensusBrief: brief,
        feasibilityConsensus: feasAvg,
      },
    });

    return NextResponse.json({ brief });
  } catch (error: any) {
    console.error('Brief generation error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate brief' }, { status: 500 });
  }
}

// PATCH — Approve/publish the brief (admin only) or update the brief text
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin('knowledge.brief.manage');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const body = await req.json();
  const data: any = {};

  if (body.action === 'publish') {
    data.consensusPublishedAt = new Date();
    data.status = 'PUBLISHED';
  } else if (body.action === 'unpublish') {
    data.consensusPublishedAt = null;
    data.status = 'IN_SYNTHESIS';
  } else if (body.brief !== undefined || body.abstract !== undefined) {
    if (body.brief !== undefined) data.consensusBrief = body.brief;
    if (body.abstract !== undefined) data.consensusAbstract = body.abstract;
  }

  const updated = await prisma.debate.update({
    where: { id: params.id },
    data,
    select: { consensusBrief: true, consensusAbstract: true, consensusPublishedAt: true, status: true },
  });
  return NextResponse.json(updated);
}

// GET — Generate PDF of the consensus brief
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debate = await prisma.debate.findUnique({
    where: { id: params.id },
    select: { id: true, initiatorId: true, title: true, consensusBrief: true, consensusPublishedAt: true, healthDomain: true, geographyFocus: true, type: true, feasibilityConsensus: true },
  });
  if (!debate || !debate.consensusBrief) return NextResponse.json({ error: 'No brief available' }, { status: 404 });

  // Check if published (non-admins can only download published briefs)
  const adminCheck = await requireAdmin('knowledge.brief.manage');
  if (!debate.consensusPublishedAt && !adminCheck.ok) {
    return NextResponse.json({ error: 'Brief not yet published' }, { status: 403 });
  }

  // Paywall: abstract is free, full brief requires access (admin/initiator/pilot/purchase)
  const access = await getBriefAccess(session.user.id, { id: debate.id, initiatorId: debate.initiatorId }, adminCheck.ok);
  if (!access.canDownload) {
    return NextResponse.json({ error: 'Payment required', code: 'PAYMENT_REQUIRED' }, { status: 402 });
  }

  const briefHtml = md2html(esc(debate.consensusBrief));
  const published = debate.consensusPublishedAt
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(debate.consensusPublishedAt))
    : 'Draft';

  const html = buildBriefPdfHtml({
    title: esc(debate.title),
    type: debate.type,
    healthDomain: esc(debate.healthDomain),
    geography: esc(debate.geographyFocus),
    published,
    feasibility: debate.feasibilityConsensus,
    body: briefHtml,
  });

  const apiKey = process.env.ABACUSAI_API_KEY;
  const pdfResp = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployment_token: apiKey,
      html_content: html,
      pdf_options: { format: 'A4', print_background: true, margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' } },
    }),
  });
  const pdfData = await pdfResp.json();
  const requestId = pdfData?.request_id || pdfData?.result?.request_id;
  if (!requestId) {
    return NextResponse.json({ error: 'PDF generation failed to start' }, { status: 502 });
  }
  return NextResponse.json({ requestId });
}

function buildBriefPdfHtml(o: {
  title: string; type: string; healthDomain: string | null;
  geography: string | null; published: string; feasibility: number | null; body: string;
}): string {
  const typeLabel = o.type === 'POLICY_PRACTICE' ? 'Policy vs Practice' : o.type === 'RESEARCH_FEASIBILITY' ? 'Research Feasibility' : 'Innovation Pilot Review';
  const typeColor = o.type === 'POLICY_PRACTICE' ? '#2ABFB0' : o.type === 'RESEARCH_FEASIBILITY' ? '#8B7FD4' : '#FBBF24';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #0B0F1A;
    color: #E0E6EF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    line-height: 1.7;
    font-size: 11pt;
  }
  .header {
    background: linear-gradient(135deg, #131929 0%, #0f1420 100%);
    border-bottom: 2px solid ${typeColor};
    padding: 20mm 15mm 12mm;
  }
  .brand { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8mm; }
  .wordmark { font-size: 14pt; font-weight: bold; color: #2ABFB0; letter-spacing: 1.5px; }
  .wordmark span { color: #FBBF24; }
  .doc-type { font-size: 8pt; letter-spacing: 3px; text-transform: uppercase; color: rgba(224,230,239,0.5); }
  .title { font-size: 20pt; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 5mm; }
  .meta { display: flex; gap: 10mm; flex-wrap: wrap; }
  .meta-item { font-size: 8.5pt; color: rgba(224,230,239,0.7); }
  .meta-item .val { color: ${typeColor}; font-weight: 600; }
  .content { padding: 10mm 0; }
  .content h1 { font-size: 16pt; color: #fff; margin: 8mm 0 4mm; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2mm; }
  .content h2 { font-size: 13pt; color: ${typeColor}; margin: 7mm 0 3mm; }
  .content h3 { font-size: 11pt; color: #FBBF24; margin: 5mm 0 2mm; }
  .content p { margin-bottom: 3mm; }
  .content ul { margin: 2mm 0 4mm 5mm; }
  .content li { margin-bottom: 1.5mm; }
  .content hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6mm 0; }
  .content strong { color: #fff; }
  .content em { color: rgba(224,230,239,0.8); }
  .footer {
    margin-top: 8mm; padding-top: 5mm;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex; justify-content: space-between;
    font-size: 8pt; color: rgba(224,230,239,0.4);
  }
</style></head>
<body>
<div class="header">
  <div class="brand">
    <div class="wordmark">PAX<span>.</span> The Praxis Exchange</div>
    <div class="doc-type">Consensus Intelligence Brief</div>
  </div>
  <div class="title">${o.title}</div>
  <div class="meta">
    <div class="meta-item">Type: <span class="val">${typeLabel}</span></div>
    ${o.healthDomain ? `<div class="meta-item">Domain: <span class="val">${o.healthDomain}</span></div>` : ''}
    ${o.geography ? `<div class="meta-item">Geography: <span class="val">${o.geography}</span></div>` : ''}
    ${o.feasibility != null ? `<div class="meta-item">Feasibility: <span class="val">${o.feasibility.toFixed(1)}/5</span></div>` : ''}
    <div class="meta-item">Published: <span class="val">${o.published}</span></div>
  </div>
</div>
<div class="content">${o.body}</div>
<div class="footer">
  <div>The Praxis Exchange — Where frontline experience becomes evidence</div>
  <div>thepraxisexchange.abacusai.app</div>
</div>
</body></html>`;
}
