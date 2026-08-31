export const dynamic = 'force-dynamic';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="w-7 h-7 text-[#B26F09]" />
          <h1 className="text-2xl font-bold text-[#1A2332]">Regulatory & Legal Disclaimer</h1>
        </div>

        <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Platform Status</h2>
            <p>
              PAX (Praxis Exchange) is a technology platform and <strong className="text-gray-700">passive intermediary</strong>.
              PAX is <strong className="text-gray-700">not</strong> a healthcare provider, pharmacy, clinical authority,
              broker-dealer, financial institution, insurer, or regulatory body. PAX does not sell, hold, ship,
              prescribe, diagnose, or directly provide any products or services listed on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Information Disclaimer</h2>
            <p>
              All content, listings, innovations, debate outputs, consensus briefs, and intelligence reports
              on PAX are provided for <strong className="text-gray-700">professional reference and connection
              purposes only</strong>. Nothing on this platform constitutes medical advice, clinical endorsement,
              investment advice, legal counsel, or regulatory approval. Users should consult qualified
              professionals and relevant national authorities before making decisions based on information
              found on PAX.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Transactions & Liability</h2>
            <p>
              All price negotiations, sales contracts, payments, warranties, fulfilment, delivery, after-sales
              support, and dispute resolution occur <strong className="text-gray-700">directly between the
              buyer and the seller</strong> (or between the relevant parties). PAX does not process payments,
              hold funds, broker deals, issue equity, or intermediate financial transactions.
            </p>
            <p className="mt-3">
              PAX assumes <strong className="text-gray-700">no civil, legal, criminal, technical, or warranty
              liability</strong> for any third-party products, services, content, or conduct facilitated through
              this platform. Each vendor, innovator, investor, practitioner, and user bears full responsibility
              for their own actions, products, and compliance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Regulatory Compliance</h2>
            <p>
              Product regulatory approval, market authorisation, and compliance with applicable laws remain the
              sole responsibility of the relevant national authority and the individual parties involved. PAX&apos;s
              &quot;Verified&quot; vendor badge indicates that PAX has reviewed the vendor&apos;s submitted business registration
              and licensing documents — it is <strong className="text-gray-700">not a product endorsement,
              recommendation, certification, or regulatory approval</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Post-Market Surveillance</h2>
            <p>
              Adverse drug reaction reports and product quality feedback submitted through PAX are forwarded to
              relevant stakeholders for pharmacovigilance purposes. These reports are user-submitted and
              unverified. PAX does not guarantee their accuracy and does not serve as a substitute for
              established national pharmacovigilance programmes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Investment Disclaimer</h2>
            <p>
              PAX provides a connection platform for innovators and investors. It does not provide investment
              advice, act as a broker-dealer, issue securities, or guarantee returns. &quot;Express Interest&quot; and
              &quot;Request Introduction&quot; are indicative signalling mechanisms only. All due diligence, negotiation,
              and investment decisions are the sole responsibility of the parties involved.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">AI & Content Moderation</h2>
            <p>
              PAX uses automated AI-assisted content moderation to flag potentially non-compliant listings and
              content. This system operates in a <strong className="text-gray-700">flag-only, fail-open</strong> mode —
              content is never automatically removed. A human administrator reviews all flagged content. PAX does
              not guarantee that all non-compliant content will be detected or removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Data Protection</h2>
            <p>
              PAX processes personal data in accordance with the Kenya Data Protection Act, 2019 and applicable
              international data protection principles. By using PAX, you consent to the collection and processing
              of your data as described in our{' '}
              <Link href="/privacy" className="text-[#15908A] hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1A2332] mb-3">Governing Law</h2>
            <p>
              These terms and the use of PAX are governed by the laws of the Republic of Kenya. Any disputes
              arising from the use of this platform shall be subject to the exclusive jurisdiction of the
              courts of Kenya.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E4E7EC] text-center">
          <p className="text-xs text-gray-600">© 2026 Praxis Exchange (PAX). All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-[#1F7A74]">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-gray-500 hover:text-[#1F7A74]">Terms of Service</Link>
            <Link href="/contact" className="text-xs text-gray-500 hover:text-[#1F7A74]">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
