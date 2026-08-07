-- ⚠ ÉTAPE AJOUTÉE À LA MAIN — Drizzle ne la génère pas, et sans elle la
-- migration échoue sur toute base contenant des rattachements historiques.
--
-- Les calendriers rattachés sans `ajoute_par` étaient ceux du COMPTE DE SERVICE,
-- partagés manuellement avec lui. Ce compte a été retiré du projet (il imposait
-- le scope `auth/calendar`, le plus large de l'API Calendar, impossible à
-- justifier sous le principe de moindre privilège de la vérification Google).
-- Ces lignes ne mènent donc plus nulle part : les garder afficherait des
-- calendriers définitivement vides. On les supprime ; ils se reconnectent en
-- OAuth depuis /agenda, en quelques secondes.
DELETE FROM "foyer_agendas" WHERE "ajoute_par" IS NULL;
--> statement-breakpoint
ALTER TABLE "foyer_agendas" DROP CONSTRAINT "foyer_agendas_ajoute_par_utilisateurs_id_fk";
--> statement-breakpoint
ALTER TABLE "foyer_agendas" ALTER COLUMN "ajoute_par" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "foyer_agendas" ADD CONSTRAINT "foyer_agendas_ajoute_par_utilisateurs_id_fk" FOREIGN KEY ("ajoute_par") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;