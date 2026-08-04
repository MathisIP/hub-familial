CREATE TABLE "comptes_google" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"access_token_chiffre" text NOT NULL,
	"refresh_token_chiffre" text,
	"expire_le" timestamp with time zone,
	"scope" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comptes_google_utilisateur_id_unique" UNIQUE("utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "comptes_google" ADD CONSTRAINT "comptes_google_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;