CREATE TABLE "cadeaux_masques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"cadeau_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cadeaux_masques_cadeau_utilisateur" UNIQUE("cadeau_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "cadeaux" DROP CONSTRAINT "cadeaux_masque_a_utilisateurs_id_fk";
--> statement-breakpoint
ALTER TABLE "cadeaux_masques" ADD CONSTRAINT "cadeaux_masques_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadeaux_masques" ADD CONSTRAINT "cadeaux_masques_cadeau_id_cadeaux_id_fk" FOREIGN KEY ("cadeau_id") REFERENCES "public"."cadeaux"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadeaux_masques" ADD CONSTRAINT "cadeaux_masques_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cadeaux_masques_foyer_idx" ON "cadeaux_masques" USING btree ("foyer_id");--> statement-breakpoint
ALTER TABLE "cadeaux" DROP COLUMN "masque_a";