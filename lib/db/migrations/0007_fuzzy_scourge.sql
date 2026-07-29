ALTER TABLE "recettes" ADD COLUMN "favori_bebe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recettes" ADD COLUMN "bebe_pas_goute" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "semaine" ADD COLUMN "entree" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "semaine" ADD COLUMN "plat" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "semaine" ADD COLUMN "dessert" text DEFAULT '' NOT NULL;