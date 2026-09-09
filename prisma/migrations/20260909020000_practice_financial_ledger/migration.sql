-- CreateTable
CREATE TABLE "PracticePayer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "facilityId" TEXT,
    "patientId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTaxRate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TAX',
    "inclusive" BOOLEAN NOT NULL DEFAULT false,
    "base" TEXT NOT NULL DEFAULT 'NET',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeTaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeInvoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "legacyInvoiceId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "netMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "expectedWithholdingMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "includePatientNames" BOOLEAN NOT NULL DEFAULT false,
    "facilitySnapshot" JSONB,
    "taxSnapshot" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "PracticeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "patientReference" TEXT,
    "patientName" TEXT,
    "facilityId" TEXT,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "PracticeInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeInvoicePayer" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "payerSnapshot" JSONB NOT NULL,

    CONSTRAINT "PracticeInvoicePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeReceipt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "dateKnown" BOOLEAN NOT NULL DEFAULT true,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "invoicePayerId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeReceiptAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAdjustment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceId" TEXT,
    "invoicePayerId" TEXT,
    "receiptId" TEXT,
    "amountMinor" INTEGER NOT NULL DEFAULT 0,
    "netMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "evidenceReference" TEXT,
    "occurredAt" TIMESTAMP(3),
    "proposedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeReconciliation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticePayer_workspaceId_kind_idx" ON "PracticePayer"("workspaceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PracticePayer_workspaceId_identityKey_key" ON "PracticePayer"("workspaceId", "identityKey");

-- CreateIndex
CREATE INDEX "PracticeTaxRate_workspaceId_active_idx" ON "PracticeTaxRate"("workspaceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvoice_number_key" ON "PracticeInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvoice_sourceKey_key" ON "PracticeInvoice"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvoice_legacyInvoiceId_key" ON "PracticeInvoice"("legacyInvoiceId");

-- CreateIndex
CREATE INDEX "PracticeInvoice_workspaceId_issuedAt_idx" ON "PracticeInvoice"("workspaceId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvoiceLine_serviceId_key" ON "PracticeInvoiceLine"("serviceId");

-- CreateIndex
CREATE INDEX "PracticeInvoiceLine_invoiceId_idx" ON "PracticeInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "PracticeInvoicePayer_payerId_dueAt_idx" ON "PracticeInvoicePayer"("payerId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvoicePayer_invoiceId_payerId_key" ON "PracticeInvoicePayer"("invoiceId", "payerId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeReceipt_sourceKey_key" ON "PracticeReceipt"("sourceKey");

-- CreateIndex
CREATE INDEX "PracticeReceipt_workspaceId_receivedAt_idx" ON "PracticeReceipt"("workspaceId", "receivedAt");

-- CreateIndex
CREATE INDEX "PracticeReceipt_payerId_idx" ON "PracticeReceipt"("payerId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeReceiptAllocation_sourceKey_key" ON "PracticeReceiptAllocation"("sourceKey");

-- CreateIndex
CREATE INDEX "PracticeReceiptAllocation_receiptId_idx" ON "PracticeReceiptAllocation"("receiptId");

-- CreateIndex
CREATE INDEX "PracticeReceiptAllocation_invoicePayerId_idx" ON "PracticeReceiptAllocation"("invoicePayerId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAdjustment_sourceKey_key" ON "PracticeAdjustment"("sourceKey");

-- CreateIndex
CREATE INDEX "PracticeAdjustment_workspaceId_status_createdAt_idx" ON "PracticeAdjustment"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeReconciliation_sourceKey_key" ON "PracticeReconciliation"("sourceKey");

-- CreateIndex
CREATE INDEX "PracticeReconciliation_workspaceId_status_idx" ON "PracticeReconciliation"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "PracticePayer" ADD CONSTRAINT "PracticePayer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTaxRate" ADD CONSTRAINT "PracticeTaxRate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoice" ADD CONSTRAINT "PracticeInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoice" ADD CONSTRAINT "PracticeInvoice_legacyInvoiceId_fkey" FOREIGN KEY ("legacyInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoiceLine" ADD CONSTRAINT "PracticeInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PracticeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoiceLine" ADD CONSTRAINT "PracticeInvoiceLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "PracticeService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoicePayer" ADD CONSTRAINT "PracticeInvoicePayer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PracticeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvoicePayer" ADD CONSTRAINT "PracticeInvoicePayer_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "PracticePayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReceipt" ADD CONSTRAINT "PracticeReceipt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReceipt" ADD CONSTRAINT "PracticeReceipt_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "PracticePayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReceiptAllocation" ADD CONSTRAINT "PracticeReceiptAllocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PracticeReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReceiptAllocation" ADD CONSTRAINT "PracticeReceiptAllocation_invoicePayerId_fkey" FOREIGN KEY ("invoicePayerId") REFERENCES "PracticeInvoicePayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAdjustment" ADD CONSTRAINT "PracticeAdjustment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAdjustment" ADD CONSTRAINT "PracticeAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PracticeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAdjustment" ADD CONSTRAINT "PracticeAdjustment_invoicePayerId_fkey" FOREIGN KEY ("invoicePayerId") REFERENCES "PracticeInvoicePayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAdjustment" ADD CONSTRAINT "PracticeAdjustment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PracticeReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeReconciliation" ADD CONSTRAINT "PracticeReconciliation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Financial records use non-negative integer minor units; issued totals reconcile exactly.
ALTER TABLE "PracticeInvoice" ADD CONSTRAINT "PracticeInvoice_amounts_check" CHECK (
  "netMinor" >= 0 AND "taxMinor" >= 0 AND "totalMinor" = "netMinor" + "taxMinor" AND "expectedWithholdingMinor" >= 0 AND currency = 'KES'
);
ALTER TABLE "PracticeInvoiceLine" ADD CONSTRAINT "PracticeInvoiceLine_amount_check" CHECK ("amountMinor" >= 0);
ALTER TABLE "PracticeInvoicePayer" ADD CONSTRAINT "PracticeInvoicePayer_amount_check" CHECK ("amountMinor" > 0);
ALTER TABLE "PracticeReceipt" ADD CONSTRAINT "PracticeReceipt_amount_date_check" CHECK ("amountMinor" > 0 AND (NOT "dateKnown" OR "receivedAt" IS NOT NULL));
ALTER TABLE "PracticeReceiptAllocation" ADD CONSTRAINT "PracticeReceiptAllocation_amount_check" CHECK ("amountMinor" > 0);
ALTER TABLE "PracticeAdjustment" ADD CONSTRAINT "PracticeAdjustment_amount_check" CHECK ("amountMinor" >= 0 AND "netMinor" >= 0 AND "taxMinor" >= 0);
ALTER TABLE "PracticeTaxRate" ADD CONSTRAINT "PracticeTaxRate_percentage_check" CHECK ("rateBps" BETWEEN 0 AND 10000 AND base IN ('NET', 'GROSS') AND kind IN ('TAX', 'WITHHOLDING'));
