import { PrismaClient, type UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_PERMISSION_KEYS, ROLE_SCOPE } from '../lib/permissions';
import { VAULT_NDA_BODY, VAULT_NDA_SLUG, VAULT_NDA_TITLE, VAULT_NDA_VERSION, vaultNdaHash } from '../lib/vault-nda';
import { PRACTICE_NOTIFICATION_TEMPLATES } from '../lib/practice-notifications';

const prisma = new PrismaClient();

async function seedAuditAccounts() {
  const accounts = [
    { email: 'timomch@gmail.com', name: 'PAX Superadmin', role: 'ADMIN', tier: 'TIER3_EXPERT', paxId: 'PAX-AD-TMCH26' },
    { email: 'machtimtim@gmail.com', name: 'PAX Practitioner', role: 'PRACTITIONER', tier: 'TIER1_BASIC', paxId: 'PAX-PR-MACHTM' },
    { email: 'timomch2@gmail.com', name: 'PAX Innovator', role: 'INNOVATOR', tier: 'TIER1_BASIC', paxId: 'PAX-IN-TMCHT2' },
    { email: 'investor@example.com', name: 'PAX Investor', role: 'INVESTOR', tier: 'TIER1_BASIC', paxId: 'PAX-IV-NVST26' },
    { email: 'employer@example.com', name: 'PAX Employer', role: 'EMPLOYER', tier: 'TIER1_BASIC', paxId: 'PAX-EM-EMPL26' },
    { email: 'policymaker@example.com', name: 'PAX Policymaker', role: 'POLICYMAKER', tier: 'TIER1_BASIC', paxId: 'PAX-PM-PLCY26' },
    { email: 'patient@example.com', name: 'PAX Patient', role: 'PATIENT', tier: 'TIER1_BASIC', paxId: 'PAX-PT-PATN26' },
  ] as const;

  for (const account of accounts) {
    const password = await bcrypt.hash(account.email, 12);
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        role: account.role,
        password,
        accountStatus: 'ACTIVE',
        emailVerified: new Date(),
        ...(account.role === 'ADMIN' ? { isSuperAdmin: true } : {}),
      },
      create: {
        email: account.email,
        name: account.name,
        password,
        role: account.role,
        tier: account.tier,
        paxId: account.paxId,
        country: 'Kenya',
        emailVerified: new Date(),
        ...(account.role === 'ADMIN' ? { isSuperAdmin: true } : {}),
      },
    });
  }

  console.log('Audit accounts seeded (7 roles).');
}

async function seedAuthorization() {
  const permissionIds = new Map<string, string>();
  for (const [key, resource, action] of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { resource, action },
      create: { key, resource, action },
      select: { id: true },
    });
    permissionIds.set(key, permission.id);
  }

  const roles = Object.keys(ROLE_PERMISSION_KEYS) as UserRole[];
  const roleIds = new Map<UserRole, string>();
  for (const role of roles) {
    const accessRole = await prisma.accessRole.upsert({
      where: { key: role },
      update: { name: role, isSystem: true, active: true },
      create: {
        key: role,
        name: role,
        description: `System permissions for ${role}`,
        isSystem: true,
      },
      select: { id: true },
    });
    roleIds.set(role, accessRole.id);

    for (const permissionKey of ROLE_PERMISSION_KEYS[role]) {
      const permissionId = permissionIds.get(permissionKey);
      if (!permissionId) throw new Error(`Missing permission seed: ${permissionKey}`);
      await prisma.rolePermission.upsert({
        where: {
          accessRoleId_permissionId: { accessRoleId: accessRole.id, permissionId },
        },
        update: { scope: ROLE_SCOPE[role] },
        create: { accessRoleId: accessRole.id, permissionId, scope: ROLE_SCOPE[role] },
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const user of users) {
    const accessRoleId = roleIds.get(user.role);
    if (!accessRoleId) continue;
    await prisma.userAccessRole.upsert({
      where: { userId_accessRoleId: { userId: user.id, accessRoleId } },
      update: { scope: ROLE_SCOPE[user.role], endsAt: null },
      create: { userId: user.id, accessRoleId, scope: ROLE_SCOPE[user.role] },
    });
  }

  console.log(`Authorization seeded (${PERMISSIONS.length} permissions, ${roles.length} roles).`);
}

async function seedNotificationTemplates() {
  const templates = [
    ...PRACTICE_NOTIFICATION_TEMPLATES,
    {
      slug: 'account.email-verification',
      channel: 'EMAIL' as const,
      subject: 'Verify your PAX email address',
      body: '<h2>Verify your email address</h2><p>Hello {{name}},</p><p>Use the secure link below to verify your PAX account. This link expires in {{expiresMinutes}} minutes.</p><p><a href="{{verificationUrl}}">Verify email address</a></p><p>If you did not create this account, you can ignore this message.</p>',
      requiredVariables: ['name', 'expiresMinutes', 'verificationUrl'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_EMAIL_VERIFICATION',
    },
    {
      slug: 'account.password-reset',
      channel: 'EMAIL' as const,
      subject: 'Reset your PAX password',
      body: '<h2>Reset your password</h2><p>Hello {{name}},</p><p>Use the secure link below to choose a new password. This link expires in {{expiresMinutes}} minutes.</p><p><a href="{{resetUrl}}">Reset password</a></p><p>If you did not request this, no action is required.</p>',
      requiredVariables: ['name', 'expiresMinutes', 'resetUrl'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_PASSWORD_RESET',
    },
    {
      slug: 'security.account-locked',
      channel: 'EMAIL' as const,
      subject: 'Security alert for your PAX account',
      body: '<h2>Account security alert</h2><p>Hello {{name}},</p><p>Your account was temporarily locked after repeated unsuccessful sign-in attempts. It will unlock at {{unlockTime}}.</p><p>If this was not you, reset your password.</p>',
      requiredVariables: ['name', 'unlockTime'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_SECURITY_ALERT',
    },
    {
      slug: 'contact.submission',
      channel: 'EMAIL' as const,
      subject: 'New contact form submission: {{subject}}',
      body: '<h2>New contact form submission</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Subject:</strong> {{subject}}</p><p><strong>Message:</strong></p><p>{{message}}</p>',
      requiredVariables: ['name', 'email', 'subject', 'message'],
      providerTemplateKey: 'NOTIF_ID_CONTACT_FORM_SUBMISSION',
    },
    {
      slug: 'safety.report-acknowledgement',
      channel: 'EMAIL' as const,
      subject: 'Your safety report was received',
      body: '<h2>Safety report received</h2><p>Thank you for submitting report {{reportReference}}. It has been recorded for authorized pharmacovigilance review.</p><p>If urgent clinical care is needed, contact an appropriate healthcare provider or emergency service.</p>',
      requiredVariables: ['reportReference'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_SAFETY_REPORT_ACKNOWLEDGEMENT',
    },
    {
      slug: 'development.update',
      channel: 'EMAIL' as const,
      subject: '{{title}}',
      body: '<h2>{{title}}</h2><p>{{message}}</p>',
      requiredVariables: ['title', 'message'],
      providerTemplateKey: 'NOTIF_ID_DEVELOPMENT_UPDATE',
    },
    {
      slug: 'talent.application-status',
      channel: 'EMAIL' as const,
      subject: 'Update on your application for {{jobTitle}}',
      body: '<h2>Application update</h2><p>Hello {{applicantName}},</p><p>Your application for {{jobTitle}} at {{organization}} is now marked {{status}}.</p><p>Sign in to PAX to review the update.</p>',
      requiredVariables: ['applicantName', 'jobTitle', 'organization', 'status'],
      providerTemplateKey: 'NOTIF_ID_JOB_APPLICATION_STATUS',
    },
    {
      slug: 'vault.access-request',
      channel: 'EMAIL' as const,
      subject: 'Vault access request for {{innovationTitle}}',
      body: '<h2>Vault access request</h2><p>{{requesterName}} has accepted NDA version {{ndaVersion}} and requested access to {{innovationTitle}}.</p><p>Sign in to review the request.</p>',
      requiredVariables: ['requesterName', 'ndaVersion', 'innovationTitle'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_VAULT_ACCESS_REQUEST',
    },
    {
      slug: 'vault.access-decision',
      channel: 'EMAIL' as const,
      subject: 'Vault access {{decision}} for {{innovationTitle}}',
      body: '<h2>Vault access update</h2><p>Your request for {{innovationTitle}} was {{decision}}.</p><p>Sign in to review the current access state.</p>',
      requiredVariables: ['decision', 'innovationTitle'],
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_VAULT_ACCESS_DECISION',
    },
    {
      slug: 'safety.signal-alert',
      channel: 'EMAIL' as const,
      subject: 'Confidential safety signal: {{level}}',
      body: '<h2>Confidential safety signal</h2><p>A {{level}} signal was detected for {{drugName}} with score {{score}} from {{reportCount}} report(s).</p><p>Review the restricted pharmacovigilance dashboard. Do not forward this message.</p>',
      requiredVariables: ['level', 'drugName', 'score', 'reportCount'],
      sensitiveAllowed: true,
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_SAFETY_SIGNAL_ALERT',
    },
    {
      slug: 'hub.overdue-payer-alert',
      channel: 'EMAIL' as const,
      subject: 'Overdue payer line on {{invoiceNumber}}',
      body: '<h2>Overdue payer line</h2><p>Invoice {{invoiceNumber}} has an outstanding payer balance of KSh {{outstanding}}.</p><p>Review it securely in your Practitioner Hub before contacting the payer.</p>',
      requiredVariables: ['invoiceNumber', 'outstanding'],
      sensitiveAllowed: true,
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_HUB_OVERDUE_ALERT',
    },
    {
      slug: 'safety.quarterly-summary',
      channel: 'EMAIL' as const,
      subject: 'Confidential quarterly safety surveillance summary',
      body: '<h2>Quarterly safety surveillance</h2><p>{{reportCount}} adverse reports and {{feedbackCount}} product feedback records were received during {{period}}.</p><p>Review the restricted safety dashboard for authorized analysis.</p>',
      requiredVariables: ['reportCount', 'feedbackCount', 'period'],
      sensitiveAllowed: true,
      nonDisableable: true,
      providerTemplateKey: 'NOTIF_ID_SAFETY_QUARTERLY_SUMMARY',
    },
    {
      slug: 'gps.endorsement-request', channel: 'IN_APP' as const,
      subject: 'Endorsement requested', body: '{{requesterName}} asked you to endorse their impact: “{{entryTitle}}”.',
      actionUrl: '/dashboard/members/{{requesterId}}', requiredVariables: ['requesterName', 'entryTitle', 'requesterId'],
    },
    {
      slug: 'innovation.submitted', channel: 'IN_APP' as const,
      subject: 'Innovation submitted for validation', body: '“{{innovationTitle}}” is now in the validation pipeline. An IP timestamp certificate has been issued.',
      actionUrl: '/innovator', requiredVariables: ['innovationTitle'],
    },
    {
      slug: 'challenge.response-received', channel: 'IN_APP' as const,
      subject: 'New response to your Challenge Brief', body: '{{responderName}} responded to “{{briefTitle}}”.',
      actionUrl: '/dashboard/challenges/{{briefId}}', requiredVariables: ['responderName', 'briefTitle', 'briefId'],
    },
    {
      slug: 'investment.match-alert', channel: 'IN_APP' as const,
      subject: 'High-impact deal alert', body: 'A new opportunity matches your mandate ({{score}}% fit): “{{innovationTitle}}”. {{reasons}}. Review it in your deal room.',
      actionUrl: '/investor/opportunities/{{innovationId}}', requiredVariables: ['score', 'innovationTitle', 'reasons', 'innovationId'],
    },
    {
      slug: 'investment.introduction-request', channel: 'IN_APP' as const,
      subject: 'Direct introduction requested', body: '{{investorName}} has requested a direct introduction regarding “{{innovationTitle}}”. Contact: {{investorEmail}}. {{note}}',
      actionUrl: '/innovator/investors', requiredVariables: ['investorName', 'innovationTitle', 'investorEmail', 'note'], sensitiveAllowed: true,
    },
    {
      slug: 'debate.contribution-received', channel: 'IN_APP' as const,
      subject: 'New contribution to your debate', body: '{{contributorName}} contributed to “{{debateTitle}}”.',
      actionUrl: '/knowledge/{{debateId}}', requiredVariables: ['contributorName', 'debateTitle', 'debateId'],
    },
    {
      slug: 'investment.interest-received', channel: 'IN_APP' as const,
      subject: '{{title}}', body: '{{investorName}} {{action}} “{{innovationTitle}}”.',
      actionUrl: '/innovator/investors', requiredVariables: ['title', 'investorName', 'action', 'innovationTitle'],
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        slug_channel_locale_version: {
          slug: template.slug,
          channel: template.channel,
          locale: 'en',
          version: 1,
        },
      },
      update: template,
      create: { ...template, locale: 'en', version: 1 },
    });
  }
  console.log(`Notification templates seeded (${templates.length}).`);
}

async function seedNdaTemplate() {
  await prisma.ndaTemplate.updateMany({ where: { slug: VAULT_NDA_SLUG, version: { not: VAULT_NDA_VERSION } }, data: { active: false } });
  await prisma.ndaTemplate.upsert({
    where: { slug_version: { slug: VAULT_NDA_SLUG, version: VAULT_NDA_VERSION } },
    update: { title: VAULT_NDA_TITLE, body: VAULT_NDA_BODY, contentHash: vaultNdaHash(), active: true },
    create: {
      slug: VAULT_NDA_SLUG,
      version: VAULT_NDA_VERSION,
      title: VAULT_NDA_TITLE,
      body: VAULT_NDA_BODY,
      contentHash: vaultNdaHash(),
      active: true,
      effectiveAt: new Date('2026-08-26T00:00:00.000Z'),
    },
  });
  console.log('Vault NDA template seeded (version 1).');
}

async function seedAdmins() {
  const pw = await bcrypt.hash('PAX@2026!', 12);
  const admins = [
    { email: 'praxis@thepraxisexchange.com', name: 'PAX Admin', paxId: 'PAX-AD-0002' },
    { email: 'gathai.mundia@thepraxisexchange.com', name: 'Gathai Mundia', paxId: 'PAX-AD-0003' },
    { email: 'timothy.mwachome@thepraxisexchange.com', name: 'Timothy Mwachome', paxId: 'PAX-AD-0004' },
  ];
  for (const a of admins) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { role: 'ADMIN', password: pw, tier: 'TIER3_EXPERT', paxId: a.paxId, accountStatus: 'ACTIVE', emailVerified: new Date() },
      create: { email: a.email, name: a.name, password: pw, role: 'ADMIN', tier: 'TIER3_EXPERT', paxId: a.paxId, country: 'Kenya', emailVerified: new Date() },
    });
  }
  console.log('Admin accounts seeded (3 admins).');
}

async function main() {
  await seedAuditAccounts();
  await seedAdmins();
  await seedAuthorization();
  await seedNotificationTemplates();
  await seedNdaTemplate();
  console.log('Seeding marketplace data...');

  // Find admin user to attach vendor records
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    console.log('No admin user found — skipping marketplace seed.');
    return;
  }

  // ── Vendor 1: Digital Public Health Tools ──
  const vendor1 = await prisma.marketplaceVendor.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      corporateName: 'AfriHealth Diagnostics Ltd',
      tradingName: 'AfriDx',
      registrationNumber: 'KE-2024-00451',
      country: 'Kenya',
      primaryPillar: 'DIGITAL_TOOLS_IP',
      headOfficeAddress: '5th Floor, I&M Tower, Kenyatta Avenue, Nairobi',
      contactPerson: 'Dr. Otieno Kamau',
      contactEmail: 'otieno@afridx.co.ke',
      contactPhone: '+254 712 345 678',
      acceptedNoDirectDrugSales: true,
      acceptedPureIntermediary: true,
      acceptedB2BTestKitRestriction: true,
      acceptedFullIndemnification: true,
      acceptedAIModeration: true,
      status: 'APPROVED',
      adminNotes: 'Flagship demo vendor — approved automatically for seed data.',
      approvedAt: new Date(),
    },
  });

  // ── Listings across 4 pillars ──

  // Pillar 1 — Digital Tools & IP
  await prisma.marketplaceListing.upsert({
    where: { id: 'seed-listing-digital-1' },
    update: {
      isPaxCertified: false,
      paxCertifiedAt: null,
      paxCertifiedReason: null,
    },
    create: {
      id: 'seed-listing-digital-1',
      vendorId: vendor1.id,
      pillar: 'DIGITAL_TOOLS_IP',
      listingType: 'SOFTWARE',
      title: 'MalariaScope AI — Point-of-Care Diagnostic',
      description:
        'Deep-learning malaria-parasite detection from standard Giemsa-stained thin smears. Works on any smartphone with a clip-on microscope adapter. Sensitivity ≥ 95 %, specificity ≥ 97 %. Cloud dashboard for facility-level surveillance.',
      priceDisplay: 'USD 1,200 / facility / year',
      isPaxCertified: false,
      isPublished: true,
    },
  });

  // Pillar 2 — Global Health Security & Analytics
  await prisma.marketplaceListing.upsert({
    where: { id: 'seed-listing-ghs-1' },
    update: {},
    create: {
      id: 'seed-listing-ghs-1',
      vendorId: vendor1.id,
      pillar: 'HEALTH_SECURITY_ANALYTICS',
      listingType: 'SERVICE',
      title: 'Outbreak Intelligence Dashboard — Real-Time Epi Modelling',
      description:
        'SaaS surveillance platform combining DHIS2 data, lab feeds, and social-media signals. Nowcasting models for cholera, measles, and Mpox. Integrates with IDSR weekly reporting. Expert advisory retainer available.',
      priceDisplay: 'USD 8,500 / quarter + advisory retainer',
      isPublished: true,
    },
  });

  // Pillar 3 — Laboratory & Radiological Hardware
  await prisma.marketplaceListing.upsert({
    where: { id: 'seed-listing-hardware-1' },
    update: {},
    create: {
      id: 'seed-listing-hardware-1',
      vendorId: vendor1.id,
      pillar: 'LAB_RADIOLOGICAL_HARDWARE',
      listingType: 'PRODUCT',
      title: 'CompactCT-64 — Mobile CT Scanner',
      description:
        'Trailer-mounted 64-slice CT scanner designed for district-level deployment in SSA. Generator-compatible (5 kVA). Includes PACS viewer licence and 12-month service contract. Vendor arranges shipping; buyer handles import clearance.',
      priceDisplay: 'USD 185,000 (one-time + annual service)',
      isPublished: true,
    },
  });

  // Pillar 4 — Pharmaceuticals & Health Products Directory
  await prisma.marketplaceListing.upsert({
    where: { id: 'seed-listing-pharma-1' },
    update: {},
    create: {
      id: 'seed-listing-pharma-1',
      vendorId: vendor1.id,
      pillar: 'PHARMA_DIRECTORY',
      listingType: 'DIRECTORY_PROFILE',
      title: 'MediPharm Kenya — Licensed Community Pharmacy',
      description:
        'EPMA-licensed retail pharmacy in Nairobi CBD. Specialises in chronic-disease dispensing (HIV, diabetes, hypertension). Billboard listing only — contact pharmacy directly for pricing and availability.',
      priceDisplay: 'Contact pharmacy directly',
      externalUrl: 'https://medipharm.example.co.ke',
      isPublished: true,
    },
  });

  console.log('Marketplace seed complete — 1 vendor, 4 listings across all pillars.');

  await seedHubFinance();
}

// ── Practitioners Hub — finance-first seed ──
const SYSTEM_INSURERS: { name: string; shortName: string; category: any }[] = [
  { name: 'Social Health Authority', shortName: 'SHA', category: 'PUBLIC' },
  { name: 'National Hospital Insurance Fund (legacy)', shortName: 'NHIF', category: 'PUBLIC' },
  { name: 'AAR Insurance', shortName: 'AAR', category: 'PRIVATE' },
  { name: 'Jubilee Health Insurance', shortName: 'Jubilee', category: 'PRIVATE' },
  { name: 'Madison Insurance', shortName: 'Madison', category: 'PRIVATE' },
  { name: 'Britam', shortName: 'Britam', category: 'PRIVATE' },
  { name: 'CIC Insurance', shortName: 'CIC', category: 'PRIVATE' },
  { name: 'APA Insurance', shortName: 'APA', category: 'PRIVATE' },
  { name: 'Old Mutual / UAP', shortName: 'UAP', category: 'PRIVATE' },
  { name: 'Minet Kenya', shortName: 'Minet', category: 'PRIVATE' },
];

async function seedHubFinance() {
  // System-default insurer directory (upsert by deterministic id — no duplicates).
  for (const ins of SYSTEM_INSURERS) {
    const id = `seed-insurer-${ins.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    await prisma.insurer.upsert({
      where: { id },
      update: { name: ins.name, shortName: ins.shortName, category: ins.category, isSystem: true },
      create: { id, name: ins.name, shortName: ins.shortName, category: ins.category, isSystem: true },
    });
  }
  console.log(`Hub seed — ${SYSTEM_INSURERS.length} system insurers upserted.`);

  // Enable the Practitioners Hub for the demo practitioner (no-op if absent).
  const john = await prisma.user.findUnique({ where: { email: 'john@doe.com' } });
  if (!john) {
    console.log('Hub seed — john@doe.com not found; skipping demo finance data.');
    return;
  }
  await prisma.user.update({ where: { id: john.id }, data: { hubMember: true } });

  // Demo patient (upsert by deterministic id).
  const patient = await prisma.hubPatient.upsert({
    where: { id: 'seed-hubpatient-1' },
    update: {},
    create: {
      id: 'seed-hubpatient-1',
      practitionerId: john.id,
      name: 'Grace Wanjiru',
      phone: '+254712345678',
      email: 'grace.wanjiru@example.com',
      patientRef: 'OPD-1042',
      notes: 'Chronic care — hypertension follow-up.',
    },
  });

  // Demo split-payer invoice: patient co-pay (paid) + SHA (pending, overdue).
  const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV-DEMO-0001' } });
  if (!existing) {
    const sha = await prisma.insurer.findUnique({ where: { id: 'seed-insurer-sha' } });
    const now = new Date();
    const overdueDue = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    await prisma.invoice.create({
      data: {
        practitionerId: john.id,
        hubPatientId: patient.id,
        invoiceNumber: 'INV-DEMO-0001',
        patientName: patient.name,
        serviceDesc: 'Consultation + full blood count + BP review',
        serviceType: 'Outpatient',
        serviceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        totalAmount: 6500,
        status: 'PARTIAL',
        notes: 'Co-pay settled at reception. SHA portion submitted for reimbursement.',
        payers: {
          create: [
            {
              payerType: 'PATIENT',
              payerName: patient.name,
              amount: 1500,
              amountPaid: 1500,
              method: 'MPESA',
              status: 'PAID',
              paidAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
              contactPhone: patient.phone,
            },
            {
              payerType: 'SHA_NHIF',
              payerName: 'SHA',
              insurerId: sha?.id ?? null,
              amount: 5000,
              amountPaid: 0,
              method: 'INSURANCE',
              status: 'OVERDUE',
              dueDate: overdueDue,
              contactEmail: 'claims@sha.go.ke',
            },
          ],
        },
      },
    });
    console.log('Hub seed — demo invoice INV-DEMO-0001 created for john@doe.com.');
  }

  await seedSurveillance();
}

// ── Post-Market Surveillance demo data (adverse drug reports + product feedback) ──
async function seedSurveillance() {
  const john = await prisma.user.findUnique({ where: { email: 'john@doe.com' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const day = 24 * 60 * 60 * 1000;
  const ago = (d: number) => new Date(Date.now() - d * day);

  const reports: Array<[string, string, string, string, number, string, string, number, string | null]> = [
    // id, drugName, severity, sideEffects, age, gender, province, daysAgo, reporterEmail-role
    ['seed-adr-1', 'Artemether-Lumefantrine', 'SEVERE', 'Severe skin rash and swelling', 34, 'Female', 'Nairobi', 5, 'john'],
    ['seed-adr-2', 'Artemether-Lumefantrine', 'LIFE_THREATENING', 'Anaphylaxis, difficulty breathing', 28, 'Male', 'Kisumu', 12, null],
    ['seed-adr-3', 'Artemether-Lumefantrine', 'MODERATE', 'Persistent vomiting and dizziness', 41, 'Female', 'Nairobi', 20, 'john'],
    ['seed-adr-4', 'Artemether-Lumefantrine', 'SEVERE', 'Severe abdominal pain, jaundice', 52, 'Male', 'Mombasa', 40, null],
    ['seed-adr-5', 'Amoxicillin', 'MODERATE', 'Hives and itching', 19, 'Female', 'Nakuru', 8, null],
    ['seed-adr-6', 'Amoxicillin', 'MILD', 'Mild diarrhoea', 30, 'Male', 'Nairobi', 33, 'john'],
    ['seed-adr-7', 'Amoxicillin', 'MODERATE', 'Facial swelling', 25, 'Female', 'Kisumu', 70, null],
    ['seed-adr-8', 'Cotrimoxazole', 'SEVERE', 'Stevens-Johnson-like rash', 45, 'Male', 'Nairobi', 15, 'admin'],
    ['seed-adr-9', 'Cotrimoxazole', 'MODERATE', 'Nausea and photosensitivity', 38, 'Female', 'Eldoret', 60, null],
    ['seed-adr-10', 'Metformin', 'MILD', 'Mild stomach upset', 55, 'Male', 'Mombasa', 25, null],
    ['seed-adr-11', 'Rifampicin', 'MODERATE', 'Orange urine, mild fever', 47, 'Female', 'Nakuru', 90, null],
    ['seed-adr-12', 'Diclofenac', 'SEVERE', 'Gastric bleeding', 63, 'Male', 'Nairobi', 3, 'admin'],
  ];

  for (const [id, drugName, severity, sideEffects, patientAge, patientGender, province, daysAgo, who] of reports) {
    const reporterId = who === 'john' ? john?.id ?? null : who === 'admin' ? admin?.id ?? null : null;
    const data = {
      drugName, sideEffects, severity: severity as any, patientAge, patientGender,
      doseTaken: 'As prescribed', province, country: 'Kenya', reporterId,
      createdAt: ago(daysAgo),
    };
    await prisma.adverseDrugReport.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const feedbacks: Array<[string, string, number, string, boolean, number, string, string, number, string | null]> = [
    // id, productName, rating, comment, isExpert, weight, tier, province, daysAgo, reviewerEmail-role
    ['seed-pf-1', 'RapidTest Malaria Kit', 2, 'False negatives observed in field use', true, 3, 'EXPERT_COMMENT', 'Nairobi', 10, 'john'],
    ['seed-pf-2', 'RapidTest Malaria Kit', 1, 'Unreliable, cassette leaked', false, 1, 'STAR_COMMENT', 'Kisumu', 20, null],
    ['seed-pf-3', 'RapidTest Malaria Kit', 2, 'Inconsistent results across batches', true, 3, 'EXPERT_COMMENT', 'Mombasa', 35, 'john'],
    ['seed-pf-4', 'ThermoScan Pro', 5, 'Accurate and fast, great for triage', true, 3, 'EXPERT_COMMENT', 'Nairobi', 15, 'john'],
    ['seed-pf-5', 'ThermoScan Pro', 4, 'Good but a bit pricey', false, 1, 'STAR_COMMENT', 'Nakuru', 40, null],
    ['seed-pf-6', 'SolarFridge Vaccine Cooler', 4, 'Holds temperature well off-grid', true, 3, 'EXPERT_COMMENT', 'Kisumu', 22, 'john'],
    ['seed-pf-7', 'SolarFridge Vaccine Cooler', 3, 'Setup was tricky but works', false, 1, 'STAR_COMMENT', 'Eldoret', 55, null],
  ];

  for (const [id, productName, rating, comment, isExpert, weight, tier, province, daysAgo, who] of feedbacks) {
    const reviewerId = who === 'john' ? john?.id ?? null : null;
    const data = {
      productName, rating, comment, isExpertReview: isExpert, expertWeight: weight,
      feedbackTier: tier, province, country: 'Kenya', reviewerId, createdAt: ago(daysAgo),
    };
    await prisma.productFeedback.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  console.log(`Surveillance seed — ${reports.length} adverse reports, ${feedbacks.length} product reviews upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
