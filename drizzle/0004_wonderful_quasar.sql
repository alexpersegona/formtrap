CREATE TABLE "usageOverage" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"billingMonth" text NOT NULL,
	"submissionOverage" integer DEFAULT 0 NOT NULL,
	"storageOverageMb" integer DEFAULT 0 NOT NULL,
	"submissionCharge" integer DEFAULT 0 NOT NULL,
	"storageCharge" integer DEFAULT 0 NOT NULL,
	"totalCharge" integer DEFAULT 0 NOT NULL,
	"stripeInvoiceId" text,
	"stripePaid" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_slug_unique";--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "allowFileUploads" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "maxFileSize" SET DEFAULT 2097152;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "maxUsersPerSpace" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "maxFormsPerSpace" SET DEFAULT 3;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "maxFileCount" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "honeypotFieldName" text DEFAULT 'website';--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "responseType" text DEFAULT 'json' NOT NULL;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "redirectUrl" text;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "successMessage" text DEFAULT 'Thank you! Your submission has been received.';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "dataRetentionDays" integer;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "isRead" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "isClosed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "associationId" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "device" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "deviceType" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "os" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "browser" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "isRobot" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "retentionDays" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "overageMode" text DEFAULT 'pause' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "billingCycle" text DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "paymentProvider" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "paymentCustomerId" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "paymentSubscriptionId" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "paymentPriceId" text;--> statement-breakpoint
ALTER TABLE "usageOverage" ADD CONSTRAINT "usageOverage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_forms_organization" ON "form" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_forms_org_active" ON "form" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "idx_submissions_form_created" ON "submission" USING btree ("formId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_submissions_spam" ON "submission" USING btree ("isSpam") WHERE "submission"."isSpam" = true;--> statement-breakpoint
CREATE INDEX "idx_submissions_form_spam" ON "submission" USING btree ("formId","isSpam");--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" DROP COLUMN "lastMonthlyReset";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripeCustomerId";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripeSubscriptionId";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripePriceId";--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" ADD CONSTRAINT "storage_check" CHECK ("spaceResourceUsage"."usedStorageMb" >= 0);--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" ADD CONSTRAINT "submissions_month_check" CHECK ("spaceResourceUsage"."submissionsThisMonth" >= 0);--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" ADD CONSTRAINT "submissions_total_check" CHECK ("spaceResourceUsage"."totalSubmissions" >= 0);--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" ADD CONSTRAINT "members_check" CHECK ("spaceResourceUsage"."activeMembers" >= 0);--> statement-breakpoint
ALTER TABLE "spaceResourceUsage" ADD CONSTRAINT "forms_check" CHECK ("spaceResourceUsage"."activeForms" >= 0);