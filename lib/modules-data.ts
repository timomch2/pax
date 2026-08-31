export interface ModuleFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ModuleData {
  slug: string;
  num: string;
  emoji: string;
  title: string;
  tagline: string;
  color: string;
  heroDescription: string;
  valueProposition: string;
  features: ModuleFeature[];
  whoIsItFor: { role: string; benefit: string }[];
  howItWorks: { step: string; title: string; description: string }[];
  ctaTitle: string;
  ctaDescription: string;
  heroImage: string;
}

export const modulesData: ModuleData[] = [
  {
    slug: 'gps-profiles',
    num: '01',
    emoji: '🔬',
    title: 'GPS Profiles',
    tagline: 'Gap → Problem → Solution',
    color: '#2D9B94',
    heroDescription:
      'The GPS Profile is the backbone of PAX. It replaces traditional CVs and resumes with an evidence-based profile that documents what problems you\'ve solved, how you solved them, and what impact you made — not just where you studied or worked.',
    valueProposition:
      'In public health, what matters is not your degree — it\'s the gap you identified, the solution you built, and the lives you changed. The GPS Profile captures that story in a structured, endorseable, searchable format.',
    features: [
      { icon: '🎯', title: 'Gap Identification', description: 'Document the specific public health gap or problem you identified — with context, geography, and affected population.' },
      { icon: '🔧', title: 'Solution Architecture', description: 'Describe your root cause analysis and the solution you designed — methodology, innovation, and evidence base.' },
      { icon: '📊', title: 'Outcome & Impact', description: 'Quantify your results — lives saved, cost reduction, policy changes, system improvements, and scalability evidence.' },
      { icon: '✅', title: 'Peer Endorsements', description: 'Get your work validated by peers, supervisors, and community members who witnessed or benefited from your solution.' },
      { icon: '📚', title: 'Lessons Learned', description: 'Share what worked, what didn\'t, and what you\'d do differently — building a knowledge commons for others.' },
      { icon: '⭐', title: 'Credibility Score', description: 'Your profile generates a Member Credibility Score based on endorsements, evidence quality, peer reviews, and community engagement.' },
    ],
    whoIsItFor: [
      { role: 'Innovators', benefit: 'Showcase the real-world impact of your innovations beyond academic publications.' },
      { role: 'Practitioners', benefit: 'Build a professional profile that reflects your clinical innovations and problem-solving in the field.' },
      { role: 'Researchers & Students', benefit: 'Discover proven field interventions and evidence-based solutions for academic research, thesis work, and learning.' },
      { role: 'Investors', benefit: 'Identify high-impact areas and vetted talent for strategic health investment and partnership.' },
      { role: 'Industry & Manufacturers', benefit: 'Find validated field evidence to guide product development, distribution, and market entry in real-world health systems.' },
      { role: 'Governments & Policymakers', benefit: 'Access documented outcomes and community-endorsed evidence to inform health policy and resource allocation.' },
      { role: 'Employers', benefit: 'Find talent based on what they\'ve actually done — not just their credentials on paper.' },
      { role: 'Communities', benefit: 'See which solutions have worked in similar settings and connect with practitioners who understand local challenges.' },
    ],
    howItWorks: [
      { step: '01', title: 'Import or Build', description: 'Import your LinkedIn profile as a starting point, or build your GPS profile from scratch with guided prompts.' },
      { step: '02', title: 'Document Your Impact', description: 'For each gap you\'ve addressed, document the problem, your solution, the outcome, and lessons learned.' },
      { step: '03', title: 'Get Endorsed', description: 'Invite peers, supervisors, and beneficiaries to endorse specific claims in your profile.' },
      { step: '04', title: 'Get Discovered', description: 'Your GPS profile becomes searchable by employers, investors, researchers, policymakers, and collaborators across the ecosystem.' },
    ],
    ctaTitle: 'Build Your GPS Profile',
    ctaDescription: 'Show the world what you\'ve actually done — not just where you\'ve been. Your impact deserves to be documented.',
    heroImage: '/img/mod-gps.jpg?v=3',
  },
  {
    slug: 'innovation-hub',
    num: '02',
    emoji: '💡',
    title: 'Innovation Hub',
    tagline: 'From Idea to Implementation',
    color: '#F59E0B',
    heroDescription:
      'The Innovation Hub is where public health breakthroughs are born, showcased, debated, and validated. Whether you\'re at the idea stage or ready to scale, this is your launchpad.',
    valueProposition:
      'The world\'s greatest health innovations often die in silence — buried in academic journals nobody reads, or stuck in the mind of a frontline worker with no platform. The Innovation Hub changes that by making every innovation visible, debatable, and investable.',
    features: [
      { icon: '📝', title: '2-Pager Innovation Brief', description: 'Summarise your innovation in a structured, investor-ready format: problem, solution, evidence, team, and funding needs.' },
      { icon: '🗣️', title: 'Structured Debate Page', description: 'Submit your innovation for community debate — structured arguments for and against, moderated by evidence and peer review.' },
      { icon: '🔍', title: 'Innovation Discovery', description: 'Browse, filter, and search innovations by sector, geography, development stage, and impact type.' },
      { icon: '🏆', title: 'Validation Pipeline', description: 'Innovations move through stages: Submitted → Under Review → Community Validated → Investor Ready.' },
      { icon: '🤝', title: 'Collaboration Matching', description: 'Find co-innovators, technical partners, and implementation organisations aligned with your solution.' },
      { icon: '📈', title: 'Impact Tracking', description: 'Track your innovation\'s journey from concept to real-world implementation with milestone dashboards.' },
    ],
    whoIsItFor: [
      { role: 'Innovators', benefit: 'Get your innovation seen, debated, validated, and funded — all in one ecosystem.' },
      { role: 'Researchers', benefit: 'Bridge the gap between academic research and real-world public health implementation.' },
      { role: 'Investors', benefit: 'Discover pre-validated innovations with community endorsement and structured evidence.' },
    ],
    howItWorks: [
      { step: '01', title: 'Submit Your Innovation', description: 'Complete the 2-Pager Innovation Brief — a structured format that captures your problem, solution, evidence, and needs.' },
      { step: '02', title: 'Community Debate', description: 'Your innovation enters the Debate Page where peers argue for and against, strengthening or challenging your evidence.' },
      { step: '03', title: 'Validation & Scoring', description: 'Based on debate outcomes, endorsements, and evidence quality, your innovation receives a validation score.' },
      { step: '04', title: 'Connect & Scale', description: 'Validated innovations become visible to investors, employers, and implementation partners ready to fund and scale.' },
    ],
    ctaTitle: 'Submit Your Innovation',
    ctaDescription: 'The world needs your solution. Don\'t let it stay hidden. Submit it, defend it, and watch it grow.',
    heroImage: '/img/mod-innovation.jpg?v=3',
  },
  {
    slug: 'talent-marketplace',
    num: '03',
    emoji: '🌍',
    title: 'Talent Marketplace',
    tagline: 'Impact-Based Hiring',
    color: '#8B7FD4',
    heroDescription:
      'The Talent Marketplace reimagines how public health talent is discovered and hired. Instead of filtering by degrees and job titles, employers find professionals based on what problems they\'ve solved and what impact they\'ve made.',
    valueProposition:
      'Traditional hiring in public health is broken. A community health worker who saved 500 lives through an innovative vaccination programme is invisible next to an MPH graduate with zero field experience. The Talent Marketplace levels that playing field.',
    features: [
      { icon: '🎯', title: 'GPS-Based Matching', description: 'Employers search for talent using Gap-Problem-Solution criteria — finding people who\'ve solved similar challenges.' },
      { icon: '📋', title: 'Challenge Briefs', description: 'Organisations post Challenge Briefs — specific public health problems they need solved — and innovators respond with GPS profiles.' },
      { icon: '🏅', title: 'Credibility Scores', description: 'Every candidate has a transparent Credibility Score based on endorsements, peer reviews, and validated impact.' },
      { icon: '🔄', title: 'Innovation-to-Employment', description: 'Outstanding innovators get matched directly to employment opportunities based on their demonstrated capabilities.' },
      { icon: '🌐', title: 'Innovation Scouting', description: 'Institutions browse the talent pool to recruit innovators for consultancies, fellowships, or permanent roles.' },
      { icon: '⚖️', title: 'Equity Principle', description: 'Equal opportunity for all — formal qualifications are not prerequisites. Impact and evidence determine visibility.' },
    ],
    whoIsItFor: [
      { role: 'Job Seekers', benefit: 'Stand out based on your real-world impact, not just your CV credentials.' },
      { role: 'Employers', benefit: 'Find people who\'ve actually solved the problems you\'re hiring them to solve.' },
      { role: 'Institutions', benefit: 'Scout innovative talent for research partnerships, fellowships, and consultancies.' },
      { role: 'Investors', benefit: 'Discover high-impact talent and emerging health sectors worth backing.' },
      { role: 'Researchers & Students', benefit: 'Find practitioners with proven field experience for collaboration, mentorship, or case studies.' },
      { role: 'Industry & Manufacturers', benefit: 'Recruit domain experts who understand real-world distribution and adoption challenges.' },
      { role: 'Governments & Policymakers', benefit: 'Identify and engage experienced professionals for advisory roles, task forces, and programme design.' },
      { role: 'Communities', benefit: 'Access a talent pool of professionals with proven, community-endorsed track records in solving local health challenges.' },
    ],
    howItWorks: [
      { step: '01', title: 'Build Your GPS Profile', description: 'Document your gaps, solutions, and outcomes. Get endorsed by peers who witnessed your work.' },
      { step: '02', title: 'Get Matched', description: 'Our AI matches your profile to Challenge Briefs and job opportunities based on your demonstrated expertise.' },
      { step: '03', title: 'Apply or Be Found', description: 'Respond to Challenge Briefs directly, or let employers discover you through GPS-based talent search.' },
      { step: '04', title: 'Connect & Engage', description: 'Move from discovery to interview to engagement — all within the PAX ecosystem.' },
    ],
    ctaTitle: 'Join the Talent Marketplace',
    ctaDescription: 'Let your impact speak for itself. Build your GPS profile and get discovered by organisations that value what you\'ve done.',
    heroImage: '/img/mod-talent.jpg?v=3',
  },
  {
    slug: 'product-marketplace',
    num: '04',
    emoji: '🏪',
    title: 'Product Marketplace',
    tagline: 'Tools for Public Health',
    color: '#DC2626',
    heroDescription:
      'The Product Marketplace is where public health technologies, tools, and supplies meet the people who need them. From diagnostic kits to digital health platforms, this is a global procurement hub for health innovation.',
    valueProposition:
      'Finding the right public health product — whether it\'s a rapid diagnostic kit, a mHealth platform, or a supply chain tool — is often harder than it should be. The Product Marketplace brings supply and demand together in one trusted, quality-assured space.',
    features: [
      { icon: '🔍', title: 'Product Discovery', description: 'Search and filter products by category, sector, geography, price range, and certification status.' },
      { icon: '✅', title: 'Quality Assurance', description: 'Products are community-reviewed and validated. Buyers see real endorsements from practitioners who\'ve used them.' },
      { icon: '🏷️', title: 'Vendor Profiles', description: 'Every vendor has a transparent profile with product history, reviews, certifications, and community rating.' },
      { icon: '📦', title: 'Procurement Pipeline', description: 'From discovery to purchase order — manage the entire procurement process on one platform.' },
      { icon: '🌍', title: 'Regional Sourcing', description: 'Prioritise locally manufactured products and regionally based suppliers for sustainable procurement.' },
      { icon: '📊', title: 'Post-Market Surveillance', description: 'Track product performance in the field. Community feedback loops ensure continuous quality monitoring.' },
    ],
    whoIsItFor: [
      { role: 'Buyers', benefit: 'Find quality-assured public health products with transparent reviews and competitive pricing.' },
      { role: 'Vendors', benefit: 'Reach hospitals, NGOs, and governments worldwide through a trusted marketplace.' },
      { role: 'Innovators', benefit: 'Launch your health product to a ready market of practitioners and procurement officers.' },
    ],
    howItWorks: [
      { step: '01', title: 'List or Browse', description: 'Vendors list products with detailed specifications. Buyers search by category, sector, or need.' },
      { step: '02', title: 'Community Validation', description: 'Products receive reviews and endorsements from practitioners who\'ve used them in the field.' },
      { step: '03', title: 'Connect & Procure', description: 'Initiate procurement conversations directly with verified vendors through the platform.' },
      { step: '04', title: 'Monitor & Feedback', description: 'Post-purchase feedback loops ensure product quality and inform future buyers.' },
    ],
    ctaTitle: 'Explore the Marketplace',
    ctaDescription: 'Whether you\'re buying or selling, the Product Marketplace connects you with the right people and the right products.',
    heroImage: '/img/mod-marketplace.jpg?v=3',
  },
  {
    slug: 'investment-platform',
    num: '05',
    emoji: '📈',
    title: 'Investment Platform',
    tagline: 'Fund What Matters',
    color: '#2D9B94',
    heroDescription:
      'The Investment Platform is a professional deal room — not a crowdfunding site. It connects serious investors with community-validated public health innovations that are ready for funding, with full project management and financial transparency built in.',
    valueProposition:
      'Impact investors struggle to find vetted, investable health innovations in emerging and frontline markets. Innovators struggle to access capital and manage it transparently. PAX bridges both gaps with a professional investment infrastructure that builds trust on both sides.',
    features: [
      { icon: '🏛️', title: 'Professional Deal Room', description: 'Structured deal pages with executive summaries, financials, team profiles, validation scores, and due diligence materials.' },
      { icon: '📊', title: 'Project Management System', description: 'Built-in project tracking for innovators — milestones, budgets, deliverables, and progress reporting visible to investors.' },
      { icon: '💰', title: 'Milestone-Based Disbursement', description: 'Funds are released against verified milestones — not lump sums. Protecting both innovator and investor interests.' },
      { icon: '📈', title: 'Transparency Dashboard', description: 'Real-time visibility into how funds are being used — budget vs. actuals, progress reports, and financial audits.' },
      { icon: '🤝', title: 'Investor-Innovator Matching', description: 'AI-powered matching between investor focus areas and innovation sectors, stages, and geographies.' },
      { icon: '🛡️', title: 'Risk Assessment', description: 'Community validation scores, team credibility, and market analysis provide investors with pre-screened deal quality.' },
    ],
    whoIsItFor: [
      { role: 'Investors', benefit: 'Access pre-validated, community-endorsed innovations with transparent project management and milestone tracking.' },
      { role: 'Innovators', benefit: 'Get a built-in executive assistant that helps you manage funds, hit milestones, and report to investors professionally.' },
      { role: 'Funders & Donors', benefit: 'Track the impact of every dollar with real-time dashboards and verified milestone completion.' },
    ],
    howItWorks: [
      { step: '01', title: 'Innovation Gets Validated', description: 'Through the Innovation Hub and Community Validation, innovations earn credibility before appearing on the Investment Platform.' },
      { step: '02', title: 'Deal Room Created', description: 'Validated innovations get a professional deal page — pitch deck, financials, team, and investment terms.' },
      { step: '03', title: 'Investor Discovery', description: 'Matched investors review the deal, conduct due diligence, and express interest through the platform.' },
      { step: '04', title: 'Fund & Track', description: 'Once funded, the Project Management System tracks milestones, manages disbursements, and provides transparency reports.' },
    ],
    ctaTitle: 'Explore Investment Opportunities',
    ctaDescription: 'Whether you\'re funding the future or building it, the Investment Platform gives you the tools and transparency you need.',
    heroImage: '/img/mod-investment.jpg?v=3',
  },
  {
    slug: 'practitioners-hub',
    num: '06',
    emoji: '🏥',
    title: 'Practitioners Hub',
    tagline: 'Your Practice, Powered by PAX',
    color: '#F59E0B',
    heroDescription:
      'The Practitioners Hub is a complete practice management system for doctors, clinicians, and health workers. Manage your calendar, patients, billing, and financial records — while your clinical work automatically builds your professional GPS Profile.',
    valueProposition:
      'Most practice management tools are expensive, disconnected, and designed for Western healthcare systems. The Practitioners Hub is built for real-world practice — affordable, mobile-first, integrated with PAX, and designed for how frontline healthcare actually works.',
    features: [
      { icon: '📅', title: 'Smart Calendar', description: 'Manage consultations, theatre sessions, ward rounds, and reviews with an intuitive calendar that syncs across your practice.' },
      { icon: '👤', title: 'Patient Records', description: 'Unified patient records that follow the patient across encounters — visit history, allergies, insurance, and clinical notes.' },
      { icon: '💰', title: 'Billing & Ledger', description: 'Automated billing on appointment completion. Track outstanding dues, ageing reports (30/60/90 days), and payment status.' },
      { icon: '📱', title: 'USSD & Web Booking', description: 'Patients can book appointments via USSD (feature phones) or web app — reaching all demographics.' },
      { icon: '🏥', title: 'Multi-Hospital Support', description: 'Work across multiple hospitals with location-specific availability, rates, and calendar management.' },
      { icon: '🔗', title: 'GPS Profile Integration', description: 'Your clinical work — completed consultations, innovations, patient outcomes — feeds directly into your Talent Marketplace GPS Profile.' },
    ],
    whoIsItFor: [
      { role: 'Doctors & Clinicians', benefit: 'Run your practice efficiently while building your professional reputation on PAX.' },
      { role: 'Patients', benefit: 'Book appointments easily, access your records, and connect with verified practitioners.' },
      { role: 'Hospitals', benefit: 'Streamline practitioner scheduling, patient flow, and financial reconciliation.' },
    ],
    howItWorks: [
      { step: '01', title: 'Register & Verify', description: 'Create your practitioner profile with medical registration number, specialty, hospital affiliations, and consultation rates.' },
      { step: '02', title: 'Set Your Calendar', description: 'Define your availability windows across hospitals. Patients book slots via web or USSD.' },
      { step: '03', title: 'Manage & Bill', description: 'See patients, document encounters, mark appointments complete — billing is triggered automatically with PAX fee structure.' },
      { step: '04', title: 'Grow Your Profile', description: 'Every completed consultation, innovation, and patient outcome builds your GPS Profile and Credibility Score.' },
    ],
    ctaTitle: 'Start Managing Your Practice',
    ctaDescription: 'Spend less time on admin and more time on patients. Your practice management and professional growth, all in one place.',
    heroImage: '/img/mod-practice.jpg?v=3',
  },
  {
    slug: 'community-debate-hub',
    num: '07',
    emoji: '⚖️',
    title: 'PAX Exchange Community & Debate Hub',
    tagline: 'Validation → Connection → Commercialisation',
    color: '#8B7FD4',
    heroDescription:
      'The PAX Exchange Community & Debate Hub is where health professionals worldwide turn frontline experience into citable, actionable intelligence. Through structured debate, peer endorsement, and evidence-based assessment, the community validates what works — and strengthens what doesn\'t.',
    valueProposition:
      'Validation drives connection; connection drives commercialisation. Quality debate contributions build your Credibility Score, unlock expert-tier standing, and make your impact visible to investors, employers, and policymakers across the ecosystem.',
    features: [
      { icon: '🗣️', title: 'Structured Debate Page', description: 'Every innovation can be submitted for public debate — structured arguments for and against, with evidence citations and moderator oversight.' },
      { icon: '✅', title: 'Peer Endorsement', description: 'Community members endorse specific claims in GPS profiles and innovation briefs — adding credibility layer by layer.' },
      { icon: '📊', title: 'Validation Scoring', description: 'Innovations receive a transparent validation score based on debate outcomes, endorsements, evidence quality, and reviewer credibility.' },
      { icon: '🏅', title: 'Reviewer Reputation', description: 'Reviewers and debaters build their own credibility through the quality and fairness of their assessments.' },
      { icon: '🔄', title: 'Continuous Improvement', description: 'Innovators can respond to critiques, update their evidence, and re-submit — the validation process strengthens everyone.' },
      { icon: '🛡️', title: 'Quality Gate', description: 'Only community-validated innovations can access the Investment Platform — ensuring investors see pre-vetted opportunities.' },
    ],
    whoIsItFor: [
      { role: 'Practitioners', benefit: 'Share frontline field notes and implementation realities that shape policy and product design.' },
      { role: 'Innovators', benefit: 'Get your work stress-tested by peers — emerging stronger, more credible, and investor-ready.' },
      { role: 'Researchers & Students', benefit: 'Access community-validated field evidence to inform academic work and programme design.' },
      { role: 'Investors', benefit: 'Rely on community-validated evidence — not just self-reported claims — when making investment decisions.' },
      { role: 'Industry & Manufacturers', benefit: 'Discover which field challenges need solutions and which existing products need adaptation.' },
      { role: 'Governments & Policymakers', benefit: 'See how policies land on the ground and what frontline workers need to make them work.' },
      { role: 'Communities', benefit: 'Know which health solutions have been peer-reviewed and field-tested before they reach your setting.' },
    ],
    howItWorks: [
      { step: '01', title: 'Browse or Start a Debate', description: 'Explore active debates or initiate one around a policy, study, innovation, or field challenge.' },
      { step: '02', title: 'React & Contribute', description: 'Quick Reactions for everyone. Structured field reviews for Practitioners. Expert opinions for peer-vouched specialists.' },
      { step: '03', title: 'Validate & Endorse', description: 'Endorse specific claims, cite evidence, and rate feasibility — building collective intelligence.' },
      { step: '04', title: 'Consensus Published', description: 'AI-assisted synthesis produces a Consensus Brief — citable, downloadable, and linked to Marketplace innovations.' },
    ],
    ctaTitle: 'Join the Community',
    ctaDescription: 'Your field experience matters. Join the conversation, build your credibility, and help shape which health solutions move forward.',
    heroImage: '/img/mod-community.jpg?v=3',
  },
];

export const safetyModule: ModuleData = {
  slug: 'safety-hub',
  num: '08',
  emoji: '🛡️',
  title: 'Safety & Feedback Hub',
  tagline: 'Community-powered pharmacovigilance and post-market surveillance',
  color: '#2D9B94',
  heroDescription: 'Report adverse drug reactions, rate health products and technologies, and contribute to a safer health ecosystem worldwide. Open to everyone — no login required to report.',
  valueProposition: 'PAX puts safety in the hands of the community. Whether you\'ve experienced a drug side effect or used a health product, your feedback protects others and holds manufacturers accountable.',
  features: [
    { icon: '💊', title: 'Adverse Drug Reaction Reporting', description: 'Report side effects with full detail — drug name, dose, severity, patient demographics, and location.' },
    { icon: '📡', title: 'Product & Technology Reviews', description: 'Star ratings and written reviews for any health product or technology, whether listed on PAX or not.' },
    { icon: '🏥', title: 'Expert-Weighted Feedback', description: 'Reviews from verified practitioners carry double weight, ensuring professional insight shapes product reputation.' },
    { icon: '🌍', title: 'Location-Tracked Reports', description: 'Every report captures country and province, enabling regional safety pattern analysis.' },
  ],
  whoIsItFor: [
    { role: 'Patients & Community Members', benefit: 'Report side effects and share product experiences to protect others in your community.' },
    { role: 'Practitioners', benefit: 'Your expert reviews carry extra weight — help guide safe product use across the continent.' },
    { role: 'Product Owners & Innovators', benefit: 'Receive real-world feedback on your products to improve quality and safety.' },
    { role: 'Regulators & Researchers', benefit: 'Access community-generated safety signals for surveillance and decision-making.' },
  ],
  howItWorks: [
    { step: '01', title: 'Choose Report Type', description: 'Select whether you\'re reporting a drug side effect or reviewing a health product / technology.' },
    { step: '02', title: 'Fill in the Details', description: 'Provide structured information — drug name, dose, side effects, severity, or product rating and comments.' },
    { step: '03', title: 'Submit Anonymously or Logged In', description: 'Anyone can submit. Logged-in practitioners automatically get expert-weighted reviews.' },
    { step: '04', title: 'Community Benefits', description: 'Reports feed into safety dashboards, product ratings, and public health surveillance.' },
  ],
  ctaTitle: 'Report Now',
  ctaDescription: 'Your feedback saves lives. Report a drug side effect or review a health product — it takes just a few minutes.',
    heroImage: '/img/mod-safety.jpg?v=3',
};

export function getModuleBySlug(slug: string): ModuleData | undefined {
  if (slug === 'safety-hub') return safetyModule;
  return modulesData.find((m) => m.slug === slug);
}