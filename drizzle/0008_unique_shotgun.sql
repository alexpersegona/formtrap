CREATE TABLE "contactSubmission" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"ipAddress" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impersonationLog" (
	"id" text PRIMARY KEY NOT NULL,
	"superadminId" text NOT NULL,
	"targetUserId" text NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"ipAddress" text,
	"userAgent" text
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bannedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banReason" text;--> statement-breakpoint
ALTER TABLE "impersonationLog" ADD CONSTRAINT "impersonationLog_superadminId_user_id_fk" FOREIGN KEY ("superadminId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonationLog" ADD CONSTRAINT "impersonationLog_targetUserId_user_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;