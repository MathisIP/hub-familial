ALTER TABLE "membres" ADD COLUMN "surnom" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "modules_masques" jsonb DEFAULT '[]'::jsonb NOT NULL;