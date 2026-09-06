CREATE TABLE "editorial_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"statut" text DEFAULT 'À faire' NOT NULL,
	"visuel" text DEFAULT '' NOT NULL,
	"vues" integer,
	"interactions" integer,
	"enregistrements" integer,
	"partages" integer,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_posts_foyer_numero" UNIQUE("foyer_id","numero")
);
--> statement-breakpoint
ALTER TABLE "editorial_posts" ADD CONSTRAINT "editorial_posts_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_posts_foyer_idx" ON "editorial_posts" USING btree ("foyer_id");