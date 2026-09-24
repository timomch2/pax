-- Add service preferences without altering existing enrollments or permissions.
ALTER TYPE "ServiceKey" ADD VALUE IF NOT EXISTS 'innovation';
ALTER TYPE "ServiceKey" ADD VALUE IF NOT EXISTS 'investment';
ALTER TYPE "ServiceKey" ADD VALUE IF NOT EXISTS 'safety';
