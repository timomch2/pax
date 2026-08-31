import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell, PageHero } from '@/components/marketing/marketing-shell';
import { PRIVACY_POLICY_VERSION, PRIVACY_POLICY_EFFECTIVE } from '@/lib/policy-version';

export const metadata: Metadata = {
  title: 'Privacy Policy | Praxis Exchange',
  description:
    'How Praxis Exchange (PAX) collects, uses and protects your personal information, in line with the Kenya Data Protection Act, 2019.',
};

type Block =
  | { t: 'p'; v: string }
  | { t: 'bullets'; v: string[] }
  | { t: 'table'; head: [string, string]; rows: [string, string][]; narrow?: boolean };

type Section = { h: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    h: '1. Who We Are',
    blocks: [
      { t: 'p', v: 'The Praxis Exchange, referred to in this policy as PAX, we, us or our, operates the platform at thepraxisexchange.abacusai.app. We are a data controller registered with the Office of the Data Protection Commissioner of Kenya. Our registration details are available on request.' },
      { t: 'p', v: 'For some information we act as a data processor rather than a controller. Where a healthcare practitioner uses our practice management tools to record details of their own patients, that practitioner is the data controller for those patient records and we process them only on the practitioner\u2019s instructions. Section 6 explains what this means for you if you are a patient.' },
      { t: 'p', v: 'You can contact our Data Protection Officer at praxis@thepraxisexchange.com. Please put \u201CData Protection\u201D in the subject line.' },
    ],
  },
  {
    h: '2. The Law This Policy Follows',
    blocks: [
      { t: 'p', v: 'This policy is written to comply with the Data Protection Act, 2019 and the regulations made under it, including the Data Protection (General) Regulations, 2021. Where we hold health information we also observe the confidentiality duties imposed by the Health Act, 2017.' },
      { t: 'p', v: 'You have the right to complain to the Office of the Data Protection Commissioner at any time. Their contact details are published at odpc.go.ke. We would prefer you came to us first so that we can put things right, but you are not obliged to.' },
    ],
  },
  {
    h: '3. What Information We Collect',
    blocks: [
      { t: 'p', v: 'We collect different information depending on how you use PAX.' },
      {
        t: 'table',
        head: ['If you are\u2026', 'We collect'],
        narrow: true,
        rows: [
          ['A member with an account', 'Your name, email address, telephone number, profile photograph if you upload one, professional headline and biography, organisation, city and country, areas of health interest, and your professional registration or credential details where you choose to be verified.'],
          ['A practitioner using the practice tools', 'Everything above, plus the records you create about your patients \u2014 their name, contact details, an identifying reference, the service you provided, the date, the amount charged, who is liable to pay, and any notes you enter.'],
          ['A patient of a practitioner using PAX', 'Your name, contact details where your practitioner records them, an identifying reference, the service you received, the date, the amount charged, and who is paying. Where your practitioner records clinical notes or appointments, those too.'],
          ['Someone reporting a side effect or reviewing a product', 'The patient\u2019s age, sex, weight, whether they are pregnant, the medicine and dose taken, the effects experienced, their severity, other medicines being taken, when the effects started and how long they lasted, and the county or province. You may report without giving us your name.'],
          ['Anyone using the site', 'Technical information collected automatically \u2014 your network address, browser and device type, the pages you visit and the times you visit them, and information stored in cookies. See Section 12.'],
        ],
      },
      { t: 'p', v: 'We do not collect information we do not need. If you think we are asking for something unnecessary, tell us \u2014 we review this regularly and we would rather remove a field than defend it.' },
    ],
  },
  {
    h: '4. Sensitive Personal Data',
    blocks: [
      { t: 'p', v: 'Some of the information above is sensitive personal data under the Act. That includes any information about your health, any information about a medicine you have taken and its effects, and information about pregnancy. The Act sets a higher standard for this information, and so do we:' },
      {
        t: 'bullets',
        v: [
          'We rely on your explicit consent, or on the fact that the information is being handled for the provision of health care by someone under a duty of confidentiality, or on the public interest in medicine safety.',
          'We encrypt it, we restrict who can see it, and we log every time it is accessed.',
          'We never sell it. We never use it for advertising. We never share it for any purpose other than those set out in this policy.',
        ],
      },
    ],
  },
  {
    h: '5. Why We Use Your Information and on What Legal Basis',
    blocks: [
      {
        t: 'table',
        head: ['What we use it for', 'Our lawful basis'],
        rows: [
          ['Creating and running your account', 'Performing our contract with you'],
          ['Verifying that you are the professional you say you are', 'Our legitimate interest in a trustworthy network, and yours in being trusted within it'],
          ['Letting practitioners record and manage their patients and invoices', 'Performing our contract with the practitioner; the practitioner relies on their own basis for the patient relationship'],
          ['Tracking who owes what and sending payment reminders', 'Our legitimate interest, and the practitioner\u2019s legitimate interest in being paid for work done'],
          ['Recording and analysing reports of medicine side effects', 'The public interest in public health and medicine safety, together with your consent when you submit a report'],
          ['Keeping the platform secure, preventing fraud, and keeping an audit trail', 'Our legitimate interest in security, and our legal obligation to be able to demonstrate compliance'],
          ['Sending you service messages about your account', 'Performing our contract with you'],
          ['Sending you news, updates or marketing', 'Your consent, which you may withdraw at any time'],
          ['Meeting our legal, tax and regulatory duties', 'Compliance with a legal obligation'],
        ],
      },
    ],
  },
  {
    h: '6. If You Are a Patient',
    blocks: [
      { t: 'p', v: 'This section is for you if your details are on PAX because a practitioner who treated you uses our tools.' },
      {
        t: 'bullets',
        v: [
          'Your practitioner decides what to record about you. They are the data controller. We hold the information for them and act on their instructions.',
          'Your practitioner should tell you that they use PAX and should obtain your consent before entering your details. We require them to do this in the agreement they sign with us.',
          'We do not use your information for our own purposes. We do not market to you. We do not sell your data.',
          'If you want to see, correct or delete what is held about you, the fastest route is to ask your practitioner, because they control it. You may also contact us and we will pass your request to them and support them in answering it, and we will tell you that we have done so.',
          'When we send a payment reminder on your practitioner\u2019s behalf, it contains only the invoice reference, the amount and the due date. It never contains any clinical information.',
        ],
      },
    ],
  },
  {
    h: '7. Who We Share Information With',
    blocks: [
      { t: 'p', v: 'We do not sell your personal data to anyone, for any price, in any circumstances.' },
      { t: 'p', v: 'We share it only in these situations:' },
      {
        t: 'table',
        head: ['Who', 'What and why'],
        narrow: true,
        rows: [
          ['Other members of PAX', 'Only the parts of your profile you choose to make visible \u2014 for example a listing you publish, a public profile, or a credibility score. You control this in your account settings.'],
          ['Your practitioner', 'If you are a patient, the practitioner who recorded you, and any staff they authorise.'],
          ['A payer', 'Where an insurer, employer or facility is liable for your invoice, they receive the invoice reference, the amount, the date and the payer\u2019s own reference. Not your clinical details.'],
          ['Our service providers', 'The companies that host the platform, deliver our email, and provide technical infrastructure. Each is bound by a written agreement that requires them to protect your data and to use it only as we instruct.'],
          ['Regulators and authorities', 'Where we are required by law, by a court order, or by a lawful request from a regulator. We will tell you unless we are legally prohibited from doing so.'],
          ['Medicine safety authorities', 'De-identified, aggregated reports of side effects. These contain no names and no contact details.'],
          ['A purchaser of the business', 'If PAX is ever sold or merged, your data may transfer. We would tell you first and the purchaser would be bound by this policy.'],
        ],
      },
    ],
  },
  {
    h: '8. Where Your Data Is Held',
    blocks: [
      { t: 'p', v: 'PAX is hosted on cloud infrastructure located outside Kenya. This means your personal data is transferred out of the country and processed there.' },
      { t: 'p', v: 'Section 48 of the Data Protection Act permits this where appropriate safeguards are in place or where you have given explicit consent. We rely on both. Our hosting providers are bound by contractual data protection obligations, and we ask for your explicit consent to this transfer when you create your account.' },
      { t: 'p', v: 'If you do not consent to your data being processed outside Kenya, you cannot use the platform, because there is no version of it that operates without cloud hosting. We tell you this plainly rather than burying it.' },
    ],
  },
  {
    h: '9. How Long We Keep It',
    blocks: [
      {
        t: 'table',
        head: ['Information', 'How long we keep it'],
        rows: [
          ['Your account and profile', 'For as long as your account is open, and twelve months afterwards'],
          ['Login and session records', 'Twelve months'],
          ['Our audit log of who accessed what', 'Seven years, then archived'],
          ['Your consent records', 'Seven years after you withdraw consent or close your account, so that we can prove what you agreed to'],
          ['Patient records held for a practitioner', 'As your practitioner directs; by default seven years from the last entry, in line with clinical record-keeping expectations'],
          ['Invoices and payment records', 'Seven years, as required by tax law'],
          ['Reports of medicine side effects', 'Five years in active form, then archived permanently in de-identified form, because medicine safety data must not be destroyed'],
          ['Product reviews', 'Five years, then archived'],
          ['Marketing preferences', 'Until you withdraw consent, then deleted immediately'],
          ['Support correspondence', 'Three years'],
        ],
      },
      { t: 'p', v: 'We run an automated process that deletes or de-identifies information once its retention period ends. We do not keep things simply because deleting them is inconvenient.' },
    ],
  },
  {
    h: '10. Your Rights',
    blocks: [
      { t: 'p', v: 'Under Section 26 of the Data Protection Act you have the following rights. All of them are free to exercise.' },
      {
        t: 'table',
        head: ['Right', 'What it means'],
        narrow: true,
        rows: [
          ['To be informed', 'To know what we hold and why. This policy is how we tell you.'],
          ['Of access', 'To get a copy of everything we hold about you.'],
          ['To rectification', 'To have anything inaccurate corrected, and anything incomplete completed.'],
          ['To erasure', 'To have your data deleted where we no longer have a lawful reason to keep it.'],
          ['To object', 'To tell us to stop a particular use, including any use based on our legitimate interest.'],
          ['To restrict processing', 'To have us pause a use while a dispute about it is resolved.'],
          ['To portability', 'To receive your data in a structured, commonly used, machine-readable format, or to have it sent to another provider.'],
          ['To withdraw consent', 'Where we rely on consent, to withdraw it at any time. This does not affect anything lawfully done before you withdrew.'],
          ['To complain', 'To lodge a complaint with the Office of the Data Protection Commissioner.'],
        ],
      },
      { t: 'p', v: 'How to exercise them: use the privacy section of your account, where you can download, correct or delete your data directly, or email praxis@thepraxisexchange.com.' },
      { t: 'p', v: 'How quickly we respond: we acknowledge every request within seven days and resolve it within thirty days. If a request is unusually complex we may need longer, and if so we will tell you within the thirty days, explain why, and give you a date.' },
      { t: 'p', v: 'When we may refuse: rarely, and only where the law allows it \u2014 for example where deleting the data would prevent us meeting a legal obligation such as keeping tax records or preserving a medicine safety report. If we refuse we will tell you why and remind you of your right to complain.' },
    ],
  },
  {
    h: '11. How We Protect Your Information',
    blocks: [
      {
        t: 'bullets',
        v: [
          'Passwords are stored using strong one-way hashing. Nobody at PAX can read your password, including us.',
          'All traffic between you and the platform is encrypted in transit.',
          'Sensitive information, including patient identity and clinical detail, is encrypted where it is stored.',
          'Access is controlled by role. People can only see what their role requires, and practitioners can only ever see their own patients.',
          'Accounts holding patient data require a second authentication factor in addition to a password.',
          'Every access to a sensitive record is written to an audit log that cannot be altered or deleted.',
          'Sessions expire after a period of inactivity, and repeated failed login attempts lock the account.',
          'We review access rights regularly and remove what is no longer needed.',
        ],
      },
      { t: 'p', v: 'No system is perfectly secure and we will not pretend otherwise. What we can promise is that we design for the assumption that something will one day go wrong, and that we will tell you when it does.' },
    ],
  },
  {
    h: '12. Cookies',
    blocks: [
      { t: 'p', v: 'We use cookies that are strictly necessary to run the platform \u2014 to keep you signed in, to keep your session secure, and to remember your preferences. These cannot be switched off without breaking the site.' },
      { t: 'p', v: 'We do not use advertising cookies. We do not allow third-party advertising trackers. If we ever introduce analytics cookies we will ask for your consent first and give you a way to refuse without losing access.' },
      { t: 'p', v: 'You can clear or block cookies in your browser settings, but if you block the necessary ones you will not be able to sign in.' },
    ],
  },
  {
    h: '13. If There Is a Data Breach',
    blocks: [
      { t: 'p', v: 'If personal data we hold is lost, stolen or accessed without authorisation, we will notify the Office of the Data Protection Commissioner within seventy-two hours of becoming aware of it, as Section 43 of the Act requires.' },
      { t: 'p', v: 'Where the breach creates a real risk of harm to you, we will tell you directly and without undue delay. We will explain what happened, what data was involved, what we are doing about it, and what you should do to protect yourself. We will not minimise it and we will not wait until we have a comfortable story.' },
    ],
  },
  {
    h: '14. Children',
    blocks: [
      { t: 'p', v: 'PAX accounts are for adults. We do not knowingly create accounts for anyone under eighteen.' },
      { t: 'p', v: 'Children\u2019s data may nonetheless appear on the platform where a practitioner records a child patient or where a side effect report concerns a child. In those cases the practitioner or the reporting adult is responsible for obtaining the consent of the parent or guardian, and Section 33 of the Act, which requires parental consent for processing a child\u2019s data, applies. We treat children\u2019s records with the same protections as all sensitive data, and we will delete a child\u2019s record on the request of a parent or guardian unless a legal obligation prevents it.' },
    ],
  },
  {
    h: '15. Automated Decision-Making',
    blocks: [
      { t: 'p', v: 'We do not make decisions about you by automated means alone that produce legal effects or similarly significant effects. Where the platform calculates something about you \u2014 for example a credibility score based on your verified credentials and endorsements \u2014 it is an aid to human judgement, it is visible to you, and you can ask us to explain or review it.' },
    ],
  },
  {
    h: '16. Changes to This Policy',
    blocks: [
      { t: 'p', v: 'We version this policy. Each version has a number and an effective date, both shown at the top of this page. When we make a material change we will tell you through the platform and, where the change affects something you consented to, we will ask you to consent again. We keep a record of which version you accepted and when.' },
    ],
  },
  {
    h: '17. How to Contact Us',
    blocks: [
      {
        t: 'table',
        head: ['Purpose', 'Contact'],
        rows: [
          ['Data protection questions, and all requests to exercise your rights', 'praxis@thepraxisexchange.com \u2014 subject line \u201CData Protection\u201D'],
          ['General enquiries', 'praxis@thepraxisexchange.com'],
          ['Complaints to the regulator', 'Office of the Data Protection Commissioner, odpc.go.ke'],
        ],
      },
    ],
  },
];

function BlockView({ b }: { b: Block }) {
  if (b.t === 'p') {
    return <p className="text-[14px] text-gray-600 leading-relaxed">{b.v}</p>;
  }
  if (b.t === 'bullets') {
    return (
      <ul className="space-y-2">
        {b.v.map((item) => (
          <li key={item} className="flex gap-2.5 text-[14px] text-gray-600 leading-relaxed">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1F7A74]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.07]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#F7F5FA]">
            <th className={`px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#3B2352] ${b.narrow ? 'w-[30%]' : 'w-1/2'}`}>
              {b.head[0]}
            </th>
            <th className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#3B2352]">{b.head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {b.rows.map(([a, c]) => (
            <tr key={a} className="border-t border-black/[0.06] align-top">
              <td className="px-4 py-3 text-[13px] font-medium text-[#1A2332]">{a}</td>
              <td className="px-4 py-3 text-[13px] leading-relaxed text-gray-600">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="Your trust matters. This policy explains what we collect, why, how we protect it, and the rights you have under the Kenya Data Protection Act, 2019."
      />
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[820px] mx-auto">
          <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-600">
            <span className="rounded-full bg-[#F1EEF6] px-2.5 py-1 font-medium text-[#3B2352]">
              Version {PRIVACY_POLICY_VERSION}
            </span>
            <span>Effective {PRIVACY_POLICY_EFFECTIVE}</span>
            <span className="text-gray-400">·</span>
            <span>Supersedes all previous versions</span>
          </div>

          <div className="mb-10 rounded-xl border border-[#1F7A74]/20 bg-[#1F7A74]/[0.05] p-5">
            <p className="text-[13px] leading-relaxed text-gray-700">
              You can exercise every right described in Section 10 yourself, at any time, from{' '}
              <Link href="/dashboard/privacy" className="font-medium text-[#1F7A74] underline underline-offset-2">
                your privacy settings
              </Link>{' '}
              — download a copy of your data, correct it, object to a use, or ask us to delete it.
            </p>
          </div>

          <div className="space-y-9">
            {SECTIONS.map((s) => (
              <div key={s.h} className="space-y-3">
                <h2 className="font-semibold text-base text-[#1A2332]">{s.h}</h2>
                {s.blocks.map((b, i) => (
                  <BlockView key={i} b={b} />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-black/5 bg-white p-5 text-[12px] leading-relaxed text-gray-500">
            This policy is published pending completion of our registration with the Office of the Data Protection
            Commissioner. It has been drafted against the Data Protection Act, 2019 and the Data Protection (General)
            Regulations, 2021, and is subject to final review by qualified counsel.
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
