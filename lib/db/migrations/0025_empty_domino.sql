CREATE TABLE "agendas_acces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"agenda_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agendas_acces_agenda_utilisateur" UNIQUE("agenda_id","utilisateur_id")
);
--> statement-breakpoint
CREATE TABLE "dossiers_acces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"dossier_id" uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dossiers_acces_dossier_utilisateur" UNIQUE("dossier_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "cadeaux" ADD COLUMN "masque_a" uuid;--> statement-breakpoint
ALTER TABLE "dossiers" ADD COLUMN "partage" text DEFAULT 'foyer' NOT NULL;--> statement-breakpoint
ALTER TABLE "echeances" ADD COLUMN "compte_id" uuid;--> statement-breakpoint
ALTER TABLE "foyer_agendas" ADD COLUMN "partage" text DEFAULT 'foyer' NOT NULL;--> statement-breakpoint
ALTER TABLE "agendas_acces" ADD CONSTRAINT "agendas_acces_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendas_acces" ADD CONSTRAINT "agendas_acces_agenda_id_foyer_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "public"."foyer_agendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendas_acces" ADD CONSTRAINT "agendas_acces_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers_acces" ADD CONSTRAINT "dossiers_acces_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers_acces" ADD CONSTRAINT "dossiers_acces_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers_acces" ADD CONSTRAINT "dossiers_acces_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agendas_acces_foyer_idx" ON "agendas_acces" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "dossiers_acces_foyer_idx" ON "dossiers_acces" USING btree ("foyer_id");--> statement-breakpoint
ALTER TABLE "cadeaux" ADD CONSTRAINT "cadeaux_masque_a_utilisateurs_id_fk" FOREIGN KEY ("masque_a") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;