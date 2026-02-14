-- BYO Email Provider fields for connection table
ALTER TABLE "connection" ADD COLUMN "emailProvider" text;
ALTER TABLE "connection" ADD COLUMN "emailConfigEncrypted" text;
ALTER TABLE "connection" ADD COLUMN "emailStatus" text DEFAULT 'disconnected' NOT NULL;
ALTER TABLE "connection" ADD COLUMN "emailLastCheckedAt" timestamp;
ALTER TABLE "connection" ADD COLUMN "emailError" text;
