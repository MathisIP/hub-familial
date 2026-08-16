CREATE TABLE "comptes_acces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"compte_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comptes_acces_compte_utilisateur" UNIQUE("compte_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "comptes" ADD COLUMN "partage" text DEFAULT 'foyer' NOT NULL;--> statement-breakpoint
ALTER TABLE "comptes_acces" ADD CONSTRAINT "comptes_acces_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes_acces" ADD CONSTRAINT "comptes_acces_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes_acces" ADD CONSTRAINT "comptes_acces_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comptes_acces_foyer_idx" ON "comptes_acces" USING btree ("foyer_id");