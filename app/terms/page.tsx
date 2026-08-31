import type { Metadata } from 'next';
import { MarketingShell, PageHero } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | Praxis Exchange',
  description: 'The terms and conditions governing your use of the Praxis Exchange (PAX) platform.',
};

const SECTIONS = [
  { h: '1. Acceptance of Terms', p: 'By creating an account or using PAX, you agree to these Terms of Service. If you do not agree, please do not use the platform.' },
  { h: '2. Who Can Use PAX', p: 'You must be at least 18 years old and able to form a binding contract. Professional accounts (such as practitioners) may require verification of credentials before certain features are unlocked.' },
  { h: '3. Your Account', p: 'You are responsible for the accuracy of the information you provide and for keeping your login credentials secure. You are responsible for all activity that occurs under your account.' },
  { h: '4. Acceptable Use', p: 'You agree not to post false, misleading, unlawful or harmful content, infringe the rights of others, misrepresent your credentials, or attempt to disrupt or compromise the platform. PAX may remove content or suspend accounts that violate these terms.' },
  { h: '5. Content & Intellectual Property', p: 'You retain ownership of the content you post, but grant PAX a licence to host and display it to operate the platform. You must have the rights to any content you share. PAX branding and platform materials remain the property of Praxis Exchange.' },
  { h: '6. Marketplace, Payments & Fees', p: 'Certain features involve fees or transactions between members (for example, marketplace sales, consultations or subscriptions). Applicable fees are disclosed before you commit. PAX facilitates connections and transactions but is not a party to agreements made between members unless expressly stated.' },
  { h: '7. No Medical or Investment Advice', p: 'Content on PAX is for informational and professional-networking purposes. It does not constitute medical advice to patients, nor financial or investment advice. Always exercise independent professional judgement and due diligence.' },
  { h: '8. Verification & Trust', p: 'While PAX verifies identities and supports community validation, we do not guarantee the accuracy of every claim made by members. Members should conduct their own due diligence before entering agreements.' },
  { h: '9. Limitation of Liability', p: 'PAX is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, Praxis Exchange is not liable for indirect or consequential losses arising from use of the platform.' },
  { h: '10. Changes & Termination', p: 'We may update these terms or modify features over time. We may suspend or terminate accounts that breach these terms. You may close your account at any time.' },
  { h: '11. Terms of Reference', p: 'In addition to these terms, each member type (practitioner, innovator, investor, employer, vendor, policymaker and public reporter) is bound by the role-specific Terms of Reference published at /terms-of-reference, which also explain how de-identified data is used for public-health and epidemiological analysis.' },
  { h: '12. Contact', p: 'Questions about these terms can be sent to praxis@thepraxisexchange.com.' },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <PageHero eyebrow="Legal" title="Terms of Service" subtitle="The ground rules for using PAX and participating in the ecosystem." />
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[820px] mx-auto">
          <p className="text-[12px] text-gray-600 mb-8">Last updated: August 2026</p>
          <div className="space-y-7">
            {SECTIONS.map((s) => (
              <div key={s.h}>
                <h2 className="font-semibold text-base text-[#1A2332] mb-2">{s.h}</h2>
                <p className="text-[14px] text-gray-600 leading-relaxed">{s.p}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-xl border border-black/5 bg-[#FFFFFF] p-5 text-[12px] text-gray-500 leading-relaxed">
            This document is provided for general information and does not constitute legal advice. Final terms should be
            reviewed by qualified counsel in the relevant jurisdiction before launch.
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
