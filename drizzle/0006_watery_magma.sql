CREATE TABLE "connection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dbProvider" text,
	"dbConnectionStringEncrypted" text,
	"dbStatus" text DEFAULT 'disconnected' NOT NULL,
	"dbLastCheckedAt" timestamp,
	"dbError" text,
	"storageProvider" text,
	"storageConfigEncrypted" text,
	"storageStatus" text DEFAULT 'disconnected' NOT NULL,
	"storageLastCheckedAt" timestamp,
	"storageError" text,
	"spamProvider" text DEFAULT 'honeypot' NOT NULL,
	"spamSiteKey" text,
	"spamSecretKeyEncrypted" text,
	"emailCountThisMonth" integer DEFAULT 0 NOT NULL,
	"emailCountResetAt" timestamp,
	"schemaInitialized" boolean DEFAULT false NOT NULL,
	"schemaVersion" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connection_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "formEndpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"formId" text NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "formEndpoint_formId_unique" UNIQUE("formId")
);
--> statement-breakpoint
DROP TABLE "spaceResourceAllocation" CASCADE;--> statement-breakpoint
DROP TABLE "spaceResourceUsage" CASCADE;--> statement-breakpoint
DROP TABLE "usageOverage" CASCADE;--> statement-breakpoint
ALTER TABLE "connection" ADD CONSTRAINT "connection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formEndpoint" ADD CONSTRAINT "formEndpoint_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formEndpoint" ADD CONSTRAINT "formEndpoint_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_form_endpoint_form_id" ON "formEndpoint" USING btree ("formId");--> statement-breakpoint
CREATE INDEX "idx_form_endpoint_user_id" ON "formEndpoint" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "maxSpaces";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "maxSubmissionsPerMonth";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "maxStorageMb";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "maxUsersPerSpace";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "maxFormsPerSpace";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "retentionDays";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "overageMode";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "billingCycle";