CREATE TABLE "ev_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"evenement_id" uuid NOT NULL,
	"tache" text NOT NULL,
	"responsable" text DEFAULT '' NOT NULL,
	"echeance" text DEFAULT '' NOT NULL,
	"fait" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"evenement_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"rsvp" text DEFAULT 'Sans réponse' NOT NULL,
	"nb_personnes" integer DEFAULT 1 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ev_menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"evenement_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"quantite" text DEFAULT '' NOT NULL,
	"cout" text DEFAULT '' NOT NULL,
	"achete" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ev_checklist" ADD CONSTRAINT "ev_checklist_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_checklist" ADD CONSTRAINT "ev_checklist_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_invites" ADD CONSTRAINT "ev_invites_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_invites" ADD CONSTRAINT "ev_invites_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_menu" ADD CONSTRAINT "ev_menu_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ev_menu" ADD CONSTRAINT "ev_menu_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ev_checklist_evenement_idx" ON "ev_checklist" USING btree ("evenement_id");--> statement-breakpoint
CREATE INDEX "ev_invites_evenement_idx" ON "ev_invites" USING btree ("evenement_id");--> statement-breakpoint
CREATE INDEX "ev_menu_evenement_idx" ON "ev_menu" USING btree ("evenement_id");