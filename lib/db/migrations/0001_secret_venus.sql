CREATE TABLE "cadeaux" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"pour_qui" text DEFAULT '' NOT NULL,
	"occasion" text DEFAULT '' NOT NULL,
	"idee" text NOT NULL,
	"statut" text DEFAULT 'Idée' NOT NULL,
	"budget_prevu" text DEFAULT '' NOT NULL,
	"prix_paye" text DEFAULT '' NOT NULL,
	"offert_par" text DEFAULT '' NOT NULL,
	"ou" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occasions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"date" text,
	"budget" text,
	"note" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occasions_foyer_nom" UNIQUE("foyer_id","nom")
);
--> statement-breakpoint
ALTER TABLE "cadeaux" ADD CONSTRAINT "cadeaux_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occasions" ADD CONSTRAINT "occasions_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cadeaux_foyer_idx" ON "cadeaux" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "occasions_foyer_idx" ON "occasions" USING btree ("foyer_id");