CREATE TABLE "foyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"theme" text DEFAULT 'rose' NOT NULL,
	"langue" text DEFAULT 'fr' NOT NULL,
	"statut_abonnement" text DEFAULT 'essai' NOT NULL,
	"stripe_customer_id" text,
	"abonnement_fin" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"email" text NOT NULL,
	"jeton" text NOT NULL,
	"role" text DEFAULT 'membre' NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_jeton_unique" UNIQUE("jeton")
);
--> statement-breakpoint
CREATE TABLE "membres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"role" text DEFAULT 'membre' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membres_foyer_utilisateur" UNIQUE("foyer_id","utilisateur_id")
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nom" text,
	"image" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "membres_utilisateur_idx" ON "membres" USING btree ("utilisateur_id");