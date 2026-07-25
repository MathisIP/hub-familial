CREATE TABLE "evenements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"heure" text DEFAULT '' NOT NULL,
	"lieu" text DEFAULT '' NOT NULL,
	"budget_prevu" text DEFAULT '' NOT NULL,
	"depense" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"agenda_lien" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evenements" ADD CONSTRAINT "evenements_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evenements_foyer_idx" ON "evenements" USING btree ("foyer_id");