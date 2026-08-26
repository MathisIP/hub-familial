CREATE TABLE "avis_reconduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"echeance" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"email" text NOT NULL,
	"envoye_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avis_reconduction_foyer_echeance_type" UNIQUE("foyer_id","echeance","type")
);
--> statement-breakpoint
ALTER TABLE "foyers" ADD COLUMN "offre" text;--> statement-breakpoint
ALTER TABLE "avis_reconduction" ADD CONSTRAINT "avis_reconduction_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;