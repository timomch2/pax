export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { certificateRef } from '@/lib/ip-timestamp';

function esc(v: string | null | undefined): string {
  return (v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  }).format(d) + ' EAT';
}

// POST — issue (start rendering) the IP Timestamp Certificate PDF for an owned,
// submitted innovation. Returns a request_id the client polls for completion.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const innovation = await prisma.innovation.findUnique({
      where: { id: params.id },
      include: { owner: { select: { name: true } } },
    });
    if (!innovation || innovation.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!innovation.ipHash || !innovation.ipTimestampedAt) {
      return NextResponse.json({ error: 'This brief has not been submitted, so no certificate exists yet.' }, { status: 400 });
    }

    const ref = certificateRef(innovation.ipHash);
    const stamped = fmtDate(new Date(innovation.ipTimestampedAt));
    const html = buildCertificateHtml({
      ref,
      title: esc(innovation.title),
      tagline: esc(innovation.tagline),
      owner: esc(innovation.owner?.name || 'PAX Innovator'),
      sector: esc(innovation.sector),
      ipHash: innovation.ipHash,
      stamped,
    });

    const apiKey = process.env.ABACUSAI_API_KEY;
    const resp = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: apiKey,
        html_content: html,
        pdf_options: { format: 'A4', landscape: true, print_background: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } },
      }),
    });
    const data = await resp.json();
    const requestId = data?.request_id || data?.result?.request_id;
    if (!requestId) {
      console.error('Certificate create failed:', JSON.stringify(data));
      return NextResponse.json({ error: 'Could not start certificate generation.' }, { status: 502 });
    }
    return NextResponse.json({ requestId, ref });
  } catch (error: any) {
    console.error('Certificate POST error:', error);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}

function buildCertificateHtml(o: {
  ref: string; title: string; tagline: string; owner: string;
  sector: string; ipHash: string; stamped: string;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 297mm; height: 210mm; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #0B0F1A;
    color: #EAF0F6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .frame {
    position: relative;
    width: 297mm; height: 210mm;
    padding: 16mm 18mm;
    background:
      radial-gradient(1200px 500px at 50% -10%, rgba(42,191,176,0.16), transparent 60%),
      linear-gradient(135deg, #0B0F1A 0%, #0F1420 55%, #131929 100%);
    border: 2mm solid transparent;
  }
  .inner {
    position: relative;
    height: 100%;
    border: 0.6mm solid rgba(42,191,176,0.45);
    border-radius: 3mm;
    padding: 12mm 14mm;
    display: flex; flex-direction: column;
  }
  .inner::before {
    content: ''; position: absolute; inset: 2mm;
    border: 0.3mm solid rgba(251,191,36,0.35); border-radius: 2mm;
    pointer-events: none;
  }
  .brand { display: flex; align-items: center; justify-content: space-between; }
  .wordmark { font-size: 20pt; letter-spacing: 2px; font-weight: bold; color: #2ABFB0; }
  .wordmark span { color: #FBBF24; }
  .seal {
    font-family: Arial, sans-serif; font-size: 7.5pt; letter-spacing: 1px;
    text-transform: uppercase; color: rgba(234,240,246,0.55); text-align: right;
  }
  .head { text-align: center; margin-top: 9mm; }
  .kicker {
    font-family: Arial, sans-serif; font-size: 9pt; letter-spacing: 5px;
    text-transform: uppercase; color: #FBBF24; margin-bottom: 4mm;
  }
  .title { font-size: 27pt; color: #FFFFFF; line-height: 1.15; }
  .rule { width: 40mm; height: 0.6mm; background: #2ABFB0; margin: 6mm auto; }
  .body { text-align: center; font-size: 11.5pt; color: rgba(234,240,246,0.85); line-height: 1.7; }
  .body .name { display: block; font-size: 17pt; color: #2ABFB0; margin: 4mm 0; }
  .body .work { display: block; font-size: 14pt; color: #FFFFFF; margin: 3mm 0; font-style: italic; }
  .meta { display: flex; justify-content: center; gap: 14mm; margin-top: 7mm; }
  .meta div { text-align: center; }
  .meta .lbl { font-family: Arial, sans-serif; font-size: 7.5pt; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(234,240,246,0.5); }
  .meta .val { font-size: 11pt; color: #EAF0F6; margin-top: 1.5mm; }
  .hashbox {
    margin-top: auto; background: rgba(255,255,255,0.04);
    border: 0.3mm solid rgba(255,255,255,0.12); border-radius: 2mm;
    padding: 5mm 7mm; text-align: center;
  }
  .hashbox .lbl { font-family: Arial, sans-serif; font-size: 7.5pt; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(234,240,246,0.5); margin-bottom: 2mm; }
  .hashbox .hash { font-family: 'Courier New', monospace; font-size: 9.5pt; color: #2ABFB0; word-break: break-all; letter-spacing: 0.5px; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6mm; }
  .foot .tag { font-size: 10pt; font-style: italic; color: rgba(234,240,246,0.6); }
  .foot .ref { font-family: Arial, sans-serif; font-size: 8pt; letter-spacing: 1px; color: #FBBF24; text-transform: uppercase; }
</style></head>
<body><div class="frame"><div class="inner">
  <div class="brand">
    <div class="wordmark">PAX<span>.</span> The Praxis Exchange</div>
    <div class="seal">Verifiable Record<br/>of Authorship</div>
  </div>
  <div class="head">
    <div class="kicker">Intellectual Property Timestamp Certificate</div>
    <div class="title">Certificate of Authorship</div>
  </div>
  <div class="rule"></div>
  <div class="body">
    This certifies that the innovation brief below was submitted to The Praxis Exchange by
    <span class="name">${o.owner}</span>
    and recorded with a cryptographic timestamp establishing a verifiable record of authorship.
    <span class="work">&ldquo;${o.title}&rdquo;</span>
    ${o.tagline ? `<span style="font-size:10.5pt;color:rgba(234,240,246,0.7)">${o.tagline}</span>` : ''}
  </div>
  <div class="meta">
    <div><div class="lbl">Sector</div><div class="val">${o.sector}</div></div>
    <div><div class="lbl">Timestamped</div><div class="val">${o.stamped}</div></div>
    <div><div class="lbl">Certificate Ref</div><div class="val">${o.ref}</div></div>
  </div>
  <div class="hashbox">
    <div class="lbl">SHA-256 Content Fingerprint</div>
    <div class="hash">${o.ipHash}</div>
  </div>
  <div class="foot">
    <div class="tag">Bridging the Gap from Idea to Impact</div>
    <div class="ref">${o.ref}</div>
  </div>
</div></div></body></html>`;
}
