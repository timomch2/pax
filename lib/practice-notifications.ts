export const PRACTICE_NOTIFICATION_TEMPLATES = [
  {
    slug: 'practice.invitation', channel: 'EMAIL' as const, subject: 'Invitation to a PAX practice workspace',
    body: '<p>{{ownerName}} invited you to their practice workspace.</p><p><a href="{{invitationUrl}}">Review invitation</a></p><p>This invitation expires in seven days. Ignore it if it was not intended for you.</p>',
    requiredVariables: ['ownerName', 'invitationUrl'], nonDisableable: true, providerTemplateKey: 'NOTIF_ID_PRACTICE_INVITATION',
  },
  {
    slug: 'practice.booking-verification', channel: 'EMAIL' as const, subject: 'Verify your appointment request email',
    body: '<p>Use this link to verify your email and continue your appointment request.</p><p><a href="{{verificationUrl}}">Verify email</a></p><p>This link expires in 30 minutes. It does not confirm an appointment.</p>',
    requiredVariables: ['verificationUrl'], nonDisableable: true, providerTemplateKey: 'NOTIF_ID_PRACTICE_BOOKING_VERIFICATION',
  },
  {
    slug: 'practice.booking-update', channel: 'EMAIL' as const, subject: 'Appointment update',
    body: '<p>{{message}}</p><p>{{time}}</p><p><a href="{{actionUrl}}">View appointment request</a></p>',
    requiredVariables: ['message', 'time', 'actionUrl'], nonDisableable: true, providerTemplateKey: 'NOTIF_ID_PRACTICE_BOOKING_UPDATE',
  },
  {
    slug: 'practice.appointment-reminder', channel: 'EMAIL' as const, subject: 'Appointment reminder',
    body: '<p>A reminder of your appointment at {{time}}.</p><p><a href="{{actionUrl}}">View appointment request</a></p>',
    requiredVariables: ['time', 'actionUrl'], nonDisableable: false, providerTemplateKey: 'NOTIF_ID_PRACTICE_APPOINTMENT_REMINDER',
  },
  {
    slug: 'practice.balance-reminder', channel: 'EMAIL' as const, subject: 'Outstanding invoice reminder',
    body: '<p>Invoice {{invoiceNumber}} has an outstanding balance of {{amount}}.</p><p>Please contact {{ownerName}} if you have already paid.</p>',
    requiredVariables: ['invoiceNumber', 'amount', 'ownerName'], nonDisableable: false, providerTemplateKey: 'NOTIF_ID_PRACTICE_BALANCE_REMINDER',
  },
];
