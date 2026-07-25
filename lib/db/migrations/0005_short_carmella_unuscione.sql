CREATE TABLE "budget_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"budget_mensuel" double precision DEFAULT 0 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comptes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"solde_initial" double precision DEFAULT 0 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "echeances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"date_iso" text,
	"recurrence" text DEFAULT 'Aucune' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"date_iso" text,
	"type" text NOT NULL,
	"compte" text DEFAULT '' NOT NULL,
	"dest" text DEFAULT '' NOT NULL,
	"categorie" text DEFAULT '' NOT NULL,
	"libelle" text DEFAULT '' NOT NULL,
	"montant" double precision DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_categories_foyer_idx" ON "budget_categories" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "comptes_foyer_idx" ON "comptes" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "echeances_foyer_idx" ON "echeances" USING btree ("foyer_id");--> statement-breakpoint
CREATE INDEX "transactions_foyer_idx" ON "transactions" USING btree ("foyer_id");