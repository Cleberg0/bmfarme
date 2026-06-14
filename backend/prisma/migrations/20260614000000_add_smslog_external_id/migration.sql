-- Migration: add externalId to SmsLog
-- Adds the externalId column to store the provider's numeric ID for polling

ALTER TABLE "SmsLog" ADD COLUMN "externalId" TEXT;
