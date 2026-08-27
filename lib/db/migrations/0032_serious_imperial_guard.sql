CREATE TABLE "admin_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"params" jsonb NOT NULL,
	"actif" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
