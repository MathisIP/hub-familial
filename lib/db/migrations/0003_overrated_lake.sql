CREATE TABLE "recettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"ingredients" jsonb NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"chaud_froid" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"personnes" integer DEFAULT 2 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"jour" text NOT NULL,
	"diner" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"personnes" integer DEFAULT 2 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "semaine_foyer_jour" UNIQUE("foyer_id","jour")
);
--> statement-breakpoint
ALTER TABLE "recettes" ADD CONSTRAINT "recettes_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaine" ADD CONSTRAINT "semaine_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recettes_foyer_idx" ON "recettes" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "semaine_foyer_idx" ON "semaine" USING btree ("foyer_id");