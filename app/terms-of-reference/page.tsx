import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell, PageHero } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Terms of Reference | Praxis Exchange',
  description:
    'The Terms of Reference for every PAX member type — what each role may do on the platform, what is expected of them, and how their data is used.',
};

type Block = { h: string; intro?: string; points: string[] };

const UNIVERSAL: Block = {
  h: 'Applies to every member',
  intro:
    'These obligations apply to all PAX members, in every country, regardless of role or membership tier.',
  points: [
    'Represent yourself accurately. Your name, qualifications, licence numbers, institution and country must be true and current. Misrepresenting credentials is grounds for immediate removal.',
    'Act within your own professional and legal scope. PAX does not extend, licence or certify your right to practise anywhere.',
    'Protect other people’s data. Never post patient-identifiable information, another member’s private information, or confidential documents you do not have the right to share.',
    'Contribute in good faith. Evidence, reviews, endorsements and debate contributions must reflect your honest professional assessment, not a commercial arrangement.',
    'Declare conflicts of interest. If you have a financial or personal interest in an innovation, product or organisation you are reviewing, say so on the record.',
    'Respect the platform’s neutrality. PAX connects parties; it is not a party to your agreements, transactions or clinical decisions.',
    'Accept that safety data is permanent. Adverse drug reaction reports and product feedback are never deleted — they are archived on a five-year cycle and retained for surveillance purposes.',
  ],
};

const ROLES: Block[] = [
  {
    h: 'Practitioners',
    intro: 'Clinicians, nurses, pharmacists, community health workers and allied health professionals.',
    points: [
      'Maintain a valid professional registration in your jurisdiction and keep your verification documents current on PAX.',
      'You remain fully and solely responsible for the clinical care you deliver. Nothing on PAX — including peer debate, product reviews or AI-assisted summaries — substitutes for your independent clinical judgement.',
      'If you use the Practitioners Hub, you are the controller of your own patient records. You decide what is entered, and you are responsible for obtaining your patients’ consent under your local health and data-protection law.',
      'PAX processes those records on your behalf, strictly to run the Hub features you use. PAX does not sell, publish or share identifiable patient data with any third party.',
      'De-identified, aggregated statistics derived from Hub activity may be used for public-health surveillance and epidemiological analysis — see “Use of data for epidemiology” below.',
      'Report suspected adverse drug reactions promptly. This complements, and does not replace, your obligation to report to your national regulator.',
    ],
  },
  {
    h: 'Innovators',
    intro: 'Individuals, research groups, start-ups and institutions submitting innovations to PAX.',
    points: [
      'Submit only work you have the right to submit, and describe its stage, evidence base and limitations honestly.',
      'Do not present pilot or preliminary findings as proven clinical outcomes, and do not imply regulatory approval you do not hold.',
      'Do not describe any innovation, product or service as PAX certified, approved or recommended. Evidence and verification records do not constitute a product endorsement or regulatory approval.',
      'Respond to peer review and debate substantively. Suppressing or retaliating against critical review is a breach of these terms.',
      'Where an innovation involves human participants, confirm that appropriate ethical approval was obtained and be prepared to evidence it.',
      'Funds raised through PAX must be applied to the purpose stated in your submission, and milestone reporting must be truthful.',
    ],
  },
  {
    h: 'Investors & funders',
    intro: 'Impact investors, funds, foundations, development finance institutions and grant-makers — based anywhere in the world.',
    points: [
      'Complete your own due diligence. PAX surfaces evidence and community validation; it does not verify financial projections, warrant returns, or act as a broker, dealer or financial adviser.',
      'Uphold the PAX Ethical Investment Manifesto, including patient-centred impact, transparency and fair dealing.',
      'Confidential material shared under NDA on PAX may only be used to evaluate the specific opportunity it was shared for.',
      'Do not use platform access to solicit members for unrelated financial products or to circumvent an innovator’s stated process.',
      'Cross-border investors are responsible for their own regulatory, tax and sanctions compliance in both their home jurisdiction and the innovator’s.',
      'Report outcomes honestly. Impact claims attached to a PAX-sourced investment should be evidenced.',
    ],
  },
  {
    h: 'Employers & institutions',
    intro: 'Hospitals, ministries, NGOs, universities and private health groups recruiting or partnering through PAX.',
    points: [
      'Post only genuine, funded opportunities with accurate terms, location and remuneration basis.',
      'Verify a candidate’s credentials independently before appointment. PAX verification is a signal, not a guarantee.',
      'Do not discriminate on grounds prohibited by the law applicable to you, and do not use PAX data to screen candidates in ways they have not been told about.',
      'Handle applicant information as confidential and retain it only as long as your own policy and law allow.',
    ],
  },
  {
    h: 'Vendors & suppliers',
    intro: 'Manufacturers, distributors and technology providers listing on the PAX Marketplace.',
    points: [
      'List only products you are legally authorised to supply in the markets you are offering them to.',
      'Provide accurate regulatory status, registration numbers, specifications and pricing. Do not imply endorsement by PAX.',
      'Honour the terms of any transaction agreed through the Marketplace; PAX records the transaction but is not a party to it.',
      'Cooperate fully with any safety signal or product-feedback investigation concerning your listing.',
      'Never solicit, incentivise or retaliate against product reviews.',
    ],
  },
  {
    h: 'Policymakers & regulators',
    intro: 'Government, regulatory authority and public-agency members with access to surveillance outputs.',
    points: [
      'Surveillance results, safety signals and aggregated epidemiological outputs are provided for public-health decision-making and are classified confidential unless PAX states otherwise.',
      'Do not attempt to re-identify individuals or facilities from aggregated outputs, and do not redistribute confidential outputs outside your mandate.',
      'PAX data supplements but does not replace official national surveillance systems.',
      'Where you act on a PAX signal, the regulatory decision and its consequences remain yours.',
    ],
  },
  {
    h: 'Members of the public & reporters',
    intro: 'Anyone submitting an adverse drug reaction report or product feedback — no account required.',
    points: [
      'PAX is not an emergency service. If you or someone else is unwell, seek medical care immediately.',
      'Report honestly and only what you know. You may report anonymously.',
      'Individual reports are confidential and are never published in identifiable form. Only aggregated, de-identified figures are shown publicly or to policymakers.',
      'Your report is retained permanently for surveillance purposes and archived on a five-year cycle. It is not deleted.',
    ],
  },
];

const EPI_POINTS = [
  'Only de-identified, aggregated data is used. Names, phone numbers, national identity numbers, email addresses, exact addresses and exact dates of birth are never included in any epidemiological output.',
  'Outputs are counts, rates and distributions — by age band, sex, region, condition category, product and time period. They are not patient records.',
  'Small numbers are suppressed. Any figure derived from fewer than five records is withheld so that no individual can be inferred.',
  'Access is restricted to PAX administrators, and — where PAX chooses to share — to policymakers and regulators for public-health purposes.',
  'Practitioners remain the controllers of their own patient records. PAX acts as processor for those records and only performs this secondary analysis as described here.',
  'No attempt at re-identification is permitted by anyone, and patient-level data is never sold, licensed or transferred to commercial third parties.',
  'This use is aligned with the Kenya Data Protection Act 2019 and, for members and data subjects in the EU/UK, with the GDPR principles of purpose limitation, data minimisation and public-interest processing of health data.',
  'You may object to your practice’s data being included in the epidemiological pool by writing to praxis@thepraxisexchange.com.',
];

function Card({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#FFFFFF] p-6 md:p-8">
      <h2 className="font-serif text-xl md:text-2xl font-light text-[#1A2332] mb-2">{block.h}</h2>
      {block.intro && <p className="text-[13px] text-[#15908A] mb-5 leading-relaxed">{block.intro}</p>}
      <ul className="space-y-3 list-none pl-0">
        {block.points.map((p, i) => (
          <li key={i} className="flex gap-3 text-[14px] text-gray-600 leading-relaxed">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#1F7A74] flex-shrink-0" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TermsOfReferencePage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Governance"
        title={<>Terms of <em className="text-[#1F7A74] font-light">Reference</em></>}
        subtitle="What each member of the PAX ecosystem may do, what is expected of them, and how data is handled. Read alongside the Terms of Service, Privacy Policy and Legal Disclaimer."
      />

      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[900px] mx-auto">
          <p className="text-[12px] text-gray-600 mb-8">Version 1.0 · August 2026</p>

          <div className="grid gap-6">
            <Card block={UNIVERSAL} />
            {ROLES.map((b) => (
              <Card key={b.h} block={b} />
            ))}

            <div className="rounded-2xl border border-[#1F7A74]/25 bg-[#E8F3F1] p-6 md:p-8">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#15908A] tracking-[2px] uppercase mb-3">
                <span className="w-6 h-px bg-[#15908A]" />Use of data for epidemiology
              </div>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-5">
                PAX analyses activity on the platform — including anonymised practice data, safety reports and product
                feedback — to understand disease patterns, treatment trends and product safety at population level. This
                is a public-health purpose and it operates under strict limits:
              </p>
              <ul className="space-y-3 list-none pl-0">
                {EPI_POINTS.map((p, i) => (
                  <li key={i} className="flex gap-3 text-[14px] text-gray-600 leading-relaxed">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#B26F09] flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-black/5 bg-[#FFFFFF] p-6 md:p-8">
              <h2 className="font-serif text-xl font-light text-[#1A2332] mb-3">Breach, review and contact</h2>
              <p className="text-[14px] text-gray-600 leading-relaxed mb-3">
                Breaches may result in content removal, loss of verification, suspension or permanent removal, and where
                required, referral to the relevant professional or regulatory body. These Terms of Reference are reviewed
                at least annually and whenever a new module launches; material changes are notified to members.
              </p>
              <p className="text-[14px] text-gray-600 leading-relaxed">
                Questions, objections and data requests: {' '}
                <a href="mailto:praxis@thepraxisexchange.com" className="text-[#1F7A74] hover:underline">
                  praxis@thepraxisexchange.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-[13px]">
            <Link href="/terms" className="text-[#1F7A74] hover:underline">Terms of Service →</Link>
            <Link href="/privacy" className="text-[#1F7A74] hover:underline">Privacy Policy →</Link>
            <Link href="/legal" className="text-[#1F7A74] hover:underline">Legal Disclaimer →</Link>
          </div>

          <div className="mt-8 rounded-xl border border-black/5 bg-[#FFFFFF] p-5 text-[12px] text-gray-500 leading-relaxed">
            This document is provided for general information and does not constitute legal advice. It should be reviewed
            by qualified counsel in each jurisdiction where PAX operates before being relied upon.
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
