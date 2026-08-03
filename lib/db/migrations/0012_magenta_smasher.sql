CREATE TABLE "demandes_adhesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"demandeur_id" uuid NOT NULL,
	"demandeur_email" text NOT NULL,
	"demandeur_nom" text,
	"message" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demandes_foyer_demandeur" UNIQUE("foyer_id","demandeur_id")
);
--> statement-breakpoint
ALTER TABLE "demandes_adhesion" ADD CONSTRAINT "demandes_adhesion_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_adhesion" ADD CONSTRAINT "demandes_adhesion_demandeur_id_utilisateurs_id_fk" FOREIGN KEY ("demandeur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demandes_foyer_idx" ON "demandes_adhesion" USING btree ("foyer_id");