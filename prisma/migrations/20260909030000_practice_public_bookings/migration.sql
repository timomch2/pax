-- AlterTable
ALTER TABLE "HubPatient" ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PracticeEvent" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PracticePayer" ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PracticeAvailability" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weekday" INTEGER,
    "date" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "startMinute" INTEGER NOT NULL DEFAULT 540,
    "endMinute" INTEGER NOT NULL DEFAULT 1020,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "facilityId" TEXT,
    "location" TEXT NOT NULL,
    "appointmentType" TEXT NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeBookingRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "availabilityId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "tokenUsedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "proposedStartsAt" TIMESTAMP(3),
    "proposedEndsAt" TIMESTAMP(3),
    "patientId" TEXT,
    "eventId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeBookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeAvailability_workspaceId_active_idx" ON "PracticeAvailability"("workspaceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeBookingRequest_tokenHash_key" ON "PracticeBookingRequest"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeBookingRequest_eventId_key" ON "PracticeBookingRequest"("eventId");

-- CreateIndex
CREATE INDEX "PracticeBookingRequest_workspaceId_status_startsAt_idx" ON "PracticeBookingRequest"("workspaceId", "status", "startsAt");

-- AddForeignKey
ALTER TABLE "PracticeAvailability" ADD CONSTRAINT "PracticeAvailability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeBookingRequest" ADD CONSTRAINT "PracticeBookingRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "PracticeAvailability" ADD CONSTRAINT "practice_availability_range" CHECK (
  (("weekday" IS NULL) <> ("date" IS NULL)) AND ("weekday" IS NULL OR "weekday" BETWEEN 0 AND 6)
  AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute"
  AND "durationMinutes" BETWEEN 10 AND 240 AND "bufferMinutes" BETWEEN 0 AND 120 AND "feeMinor" >= 0
);
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "practice_event_buffer" CHECK ("bufferMinutes" BETWEEN 0 AND 120);
ALTER TABLE "PracticeBookingRequest" ADD CONSTRAINT "practice_booking_status" CHECK ("status" IN ('UNVERIFIED','PENDING','PROPOSED','APPROVED','DECLINED','CANCELLED'));

INSERT INTO "NotificationTemplate" ("id","slug","channel","locale","version","subject","body","requiredVariables","nonDisableable","providerTemplateKey","updatedAt") VALUES ('pax-template-practice.invitation','practice.invitation','EMAIL','en',1,'Invitation to a PAX practice workspace','<p>{{ownerName}} invited you to their practice workspace.</p><p><a href="{{invitationUrl}}">Review invitation</a></p><p>This invitation expires in seven days. Ignore it if it was not intended for you.</p>',ARRAY['ownerName','invitationUrl'],true,'NOTIF_ID_PRACTICE_INVITATION',CURRENT_TIMESTAMP) ON CONFLICT ("slug","channel","locale","version") DO NOTHING;

INSERT INTO "NotificationTemplate" ("id","slug","channel","locale","version","subject","body","requiredVariables","nonDisableable","providerTemplateKey","updatedAt") VALUES ('pax-template-practice.booking-verification','practice.booking-verification','EMAIL','en',1,'Verify your appointment request email','<p>Use this link to verify your email and continue your appointment request.</p><p><a href="{{verificationUrl}}">Verify email</a></p><p>This link expires in 30 minutes. It does not confirm an appointment.</p>',ARRAY['verificationUrl'],true,'NOTIF_ID_PRACTICE_BOOKING_VERIFICATION',CURRENT_TIMESTAMP) ON CONFLICT ("slug","channel","locale","version") DO NOTHING;

INSERT INTO "NotificationTemplate" ("id","slug","channel","locale","version","subject","body","requiredVariables","nonDisableable","providerTemplateKey","updatedAt") VALUES ('pax-template-practice.booking-update','practice.booking-update','EMAIL','en',1,'Appointment update','<p>{{message}}</p><p>{{time}}</p><p><a href="{{actionUrl}}">View appointment request</a></p>',ARRAY['message','time','actionUrl'],true,'NOTIF_ID_PRACTICE_BOOKING_UPDATE',CURRENT_TIMESTAMP) ON CONFLICT ("slug","channel","locale","version") DO NOTHING;

INSERT INTO "NotificationTemplate" ("id","slug","channel","locale","version","subject","body","requiredVariables","nonDisableable","providerTemplateKey","updatedAt") VALUES ('pax-template-practice.appointment-reminder','practice.appointment-reminder','EMAIL','en',1,'Appointment reminder','<p>A reminder of your appointment at {{time}}.</p><p><a href="{{actionUrl}}">View appointment request</a></p>',ARRAY['time','actionUrl'],false,'NOTIF_ID_PRACTICE_APPOINTMENT_REMINDER',CURRENT_TIMESTAMP) ON CONFLICT ("slug","channel","locale","version") DO NOTHING;

INSERT INTO "NotificationTemplate" ("id","slug","channel","locale","version","subject","body","requiredVariables","nonDisableable","providerTemplateKey","updatedAt") VALUES ('pax-template-practice.balance-reminder','practice.balance-reminder','EMAIL','en',1,'Outstanding invoice reminder','<p>Invoice {{invoiceNumber}} has an outstanding balance of {{amount}}.</p><p>Please contact {{ownerName}} if you have already paid.</p>',ARRAY['invoiceNumber','amount','ownerName'],false,'NOTIF_ID_PRACTICE_BALANCE_REMINDER',CURRENT_TIMESTAMP) ON CONFLICT ("slug","channel","locale","version") DO NOTHING;
