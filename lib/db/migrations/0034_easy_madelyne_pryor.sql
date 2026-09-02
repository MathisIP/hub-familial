ALTER TABLE "semaine" DROP CONSTRAINT "semaine_foyer_jour";--> statement-breakpoint
ALTER TABLE "semaine" ADD COLUMN "moment" text DEFAULT 'soir' NOT NULL;--> statement-breakpoint
ALTER TABLE "semaine" ADD CONSTRAINT "semaine_foyer_jour_moment" UNIQUE("foyer_id","jour","moment");