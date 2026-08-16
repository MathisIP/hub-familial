CREATE TABLE "bac_a_sable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
