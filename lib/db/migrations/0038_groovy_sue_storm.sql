CREATE TABLE "comptes_instagram" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"access_token_chiffre" text NOT NULL,
	"expire_le" timestamp with time zone,
	"page_id" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"nom_compte" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comptes_instagram_foyer_id_unique" UNIQUE("foyer_id")
);
--> statement-breakpoint
ALTER TABLE "comptes_instagram" ADD CONSTRAINT "comptes_instagram_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;