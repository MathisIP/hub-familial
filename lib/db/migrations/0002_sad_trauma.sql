CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"fait" boolean DEFAULT false NOT NULL,
	"article" text NOT NULL,
	"rayon" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"statut" text DEFAULT 'À faire' NOT NULL,
	"tache" text NOT NULL,
	"assigne" text DEFAULT '' NOT NULL,
	"categorie" text DEFAULT '' NOT NULL,
	"priorite" text DEFAULT '' NOT NULL,
	"echeance" text DEFAULT '' NOT NULL,
	"recurrence" text DEFAULT 'Aucune' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taches" ADD CONSTRAINT "taches_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_foyer_idx" ON "courses" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "taches_foyer_idx" ON "taches" USING btree ("foyer_id");