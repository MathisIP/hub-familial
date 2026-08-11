CREATE TABLE "mouvements_projet" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"libelle" text NOT NULL,
	"categorie" text DEFAULT '' NOT NULL,
	"sens" text NOT NULL,
	"montant_centimes" integer,
	"recurrence" text,
	"fin" text,
	"note" text DEFAULT '' NOT NULL
);
