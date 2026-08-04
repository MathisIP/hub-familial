CREATE TABLE "foyer_agendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"calendar_id" text NOT NULL,
	"nom" text DEFAULT '' NOT NULL,
	"ajoute_par" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foyer_agendas_foyer_cal" UNIQUE("foyer_id","calendar_id")
);
--> statement-breakpoint
ALTER TABLE "foyer_agendas" ADD CONSTRAINT "foyer_agendas_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foyer_agendas" ADD CONSTRAINT "foyer_agendas_ajoute_par_utilisateurs_id_fk" FOREIGN KEY ("ajoute_par") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "foyer_agendas_foyer_idx" ON "foyer_agendas" USING btree ("foyer_id");