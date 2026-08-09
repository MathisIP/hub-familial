CREATE TABLE "messages_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid,
	"email" text NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"sujet" text DEFAULT 'question' NOT NULL,
	"message" text NOT NULL,
	"traite" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages_contact" ADD CONSTRAINT "messages_contact_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_contact_cree_idx" ON "messages_contact" USING btree ("cree_le");