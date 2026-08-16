CREATE TABLE "abonnements_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"appareil" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abonnements_push_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "preferences_notif" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"courses" boolean DEFAULT true NOT NULL,
	"evenements" boolean DEFAULT true NOT NULL,
	"echeances" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_notif_foyer_utilisateur" UNIQUE("foyer_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "abonnements_push" ADD CONSTRAINT "abonnements_push_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonnements_push" ADD CONSTRAINT "abonnements_push_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences_notif" ADD CONSTRAINT "preferences_notif_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences_notif" ADD CONSTRAINT "preferences_notif_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abonnements_push_utilisateur_idx" ON "abonnements_push" USING btree ("utilisateur_id");