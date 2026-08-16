/**
 * Garnit le foyer de DEMONSTRATION de donnees factices et plausibles.
 *
 *   npm run demo
 *
 * ⚠ Pourquoi ce script existe : filmer l'application pour les reseaux ou pour
 * une verification Google impose de montrer des ecrans pleins. Les remplir avec
 * un vrai foyer exposerait des soldes, des documents et l'agenda d'enfants —
 * inacceptable pour un produit qui vend la confidentialite. On filme donc un
 * foyer entierement fictif.
 *
 * Idempotent : purge d'abord les donnees de CE foyer, puis reinsere. Deux
 * garde-fous avant toute ecriture : la cible est resolue par l'e-mail (jamais un
 * id en dur) et le script s'arrete s'il tombe sur le foyer reel.
 *
 * Cible : DEMO_EMAIL dans .env, sinon mip@nestync.app.
 */
import { connexion, exigerBacASable, chargerEnv } from './_env.mjs';
import { garnirDocuments } from './_documents-demo.mjs';

chargerEnv();
const { sql, hote } = connexion({ max: 3 });
const CIBLE = (process.env.DEMO_EMAIL || 'mip@nestync.app').toLowerCase();

console.log(`  base : ${hote}`);

/*
 * ⚠ GARDE-FOU CENTRAL : ce script ne s'execute QUE sur un bac a sable marque.
 * Le test porte sur une ligne presente dans la base, pas sur l'URL — une chaine
 * de connexion se recopie de travers, et c'est justement l'erreur qu'on veut
 * rendre impossible. Voir scripts/_env.mjs.
 */
await exigerBacASable(sql, hote);

/*
 * Le foyer de demonstration, cree s'il n'existe pas encore : sur une base de
 * developpement neuve il n'y a rien. C'est ce qui permet de repartir d'une base
 * vide (`npm run bac:reset`) sans aucune etape manuelle.
 */
let [f] = await sql`
  select f.id, f.nom from foyers f
  join membres m on m.foyer_id = f.id
  join utilisateurs u on u.id = m.utilisateur_id
  where lower(u.email) = ${CIBLE}`;

if (!f) {
  console.log(`  foyer de demonstration absent : creation pour ${CIBLE}`);
  const [u] = await sql`
    insert into utilisateurs (email, nom) values (${CIBLE}, 'Clara Lambert')
    on conflict (email) do update set nom = excluded.nom
    returning id`;
  const fin = new Date(Date.now() + 365 * 86400000);
  const [nf] = await sql`
    insert into foyers (nom, statut_abonnement, abonnement_fin, onboarding_fait)
    values ('Foyer Lambert', 'essai', ${fin}, true) returning id, nom`;
  await sql`insert into membres (foyer_id, utilisateur_id, role)
    values (${nf.id}, ${u.id}, 'proprietaire')`;
  f = nf;
}

const F = f.id;
console.log(`  foyer cible : « ${f.nom} »`);

await sql`update foyers set nom = 'Foyer Lambert' where id = ${F}`;

// --- Purge de ce foyer uniquement -------------------------------------------
for (const t of ['comptes_acces', 'dossiers_acces', 'agendas_acces',
                 'transactions', 'echeances', 'comptes', 'budget_categories', 'taches',
                 'courses', 'recettes', 'semaine', 'cadeaux', 'occasions',
                 'ev_invites', 'ev_checklist', 'ev_menu', 'evenements']) {
  await sql`delete from ${sql(t)} where foyer_id = ${F}`;
}

const jj = (d) => `${String(d).padStart(2, '0')}/08/2026`;
const iso = (d) => `2026-08-${String(d).padStart(2, '0')}`;
const jjJ = (d) => `${String(d).padStart(2, '0')}/07/2026`;
const isoJ = (d) => `2026-07-${String(d).padStart(2, '0')}`;

// --- BUDGET ------------------------------------------------------------------
await sql`insert into comptes ${sql([
  { foyer_id: F, nom: 'Compte commun', solde_initial: 400, ordre: 0 },
  { foyer_id: F, nom: 'Compte Clara', solde_initial: 320, ordre: 1 },
  { foyer_id: F, nom: 'Compte Antoine', solde_initial: 280, ordre: 2 },
  { foyer_id: F, nom: 'Livret A', solde_initial: 4300, ordre: 3 },
])}`;

await sql`insert into budget_categories ${sql([
  { foyer_id: F, nom: 'Courses', type: 'depense', budget_mensuel: 450, ordre: 0 },
  { foyer_id: F, nom: 'Logement', type: 'depense', budget_mensuel: 950, ordre: 1 },
  { foyer_id: F, nom: 'Transport', type: 'depense', budget_mensuel: 160, ordre: 2 },
  { foyer_id: F, nom: 'Enfants', type: 'depense', budget_mensuel: 220, ordre: 3 },
  { foyer_id: F, nom: 'Santé', type: 'depense', budget_mensuel: 60, ordre: 4 },
  { foyer_id: F, nom: 'Loisirs', type: 'depense', budget_mensuel: 120, ordre: 5 },
  { foyer_id: F, nom: 'Abonnements', type: 'depense', budget_mensuel: 45, ordre: 6 },
  { foyer_id: F, nom: 'Restaurant', type: 'depense', budget_mensuel: 90, ordre: 7 },
  { foyer_id: F, nom: 'Salaire', type: 'revenu', budget_mensuel: 0, ordre: 8 },
  { foyer_id: F, nom: 'Aides', type: 'revenu', budget_mensuel: 0, ordre: 9 },
])}`;

const D = (jour, cat, lib, montant, compte = 'Compte commun', mois = 'a') => ({
  foyer_id: F, date: mois === 'a' ? jj(jour) : jjJ(jour), date_iso: mois === 'a' ? iso(jour) : isoJ(jour),
  type: 'Dépense', compte, dest: '', categorie: cat, libelle: lib, montant, note: '',
});
const R = (jour, cat, lib, montant, compte, mois = 'a') => ({
  foyer_id: F, date: mois === 'a' ? jj(jour) : jjJ(jour), date_iso: mois === 'a' ? iso(jour) : isoJ(jour),
  type: 'Revenu', compte, dest: '', categorie: cat, libelle: lib, montant, note: '',
});
const V = (jour, de, vers, montant, libelle, mois = 'a') => ({
  foyer_id: F, date: mois === 'a' ? jj(jour) : jjJ(jour), date_iso: mois === 'a' ? iso(jour) : isoJ(jour),
  type: 'Virement interne', compte: de, dest: vers, categorie: '', libelle, montant, note: '',
});

const tx = [
  // --- Août, le mois en cours ---
  R(1, 'Salaire', 'Salaire Clara', 1620, 'Compte Clara'),
  R(1, 'Salaire', 'Salaire Antoine', 1780, 'Compte Antoine'),
  R(5, 'Aides', 'Allocations familiales', 141.99, 'Compte commun'),
  // Chacun alimente le compte joint : sans ces virements, les depenses
  // sortiraient d'un compte qui n'est jamais approvisionne.
  V(2, 'Compte Clara', 'Compte commun', 1150, 'Part du compte commun'),
  V(2, 'Compte Antoine', 'Compte commun', 1300, 'Part du compte commun'),
  D(2, 'Logement', 'Loyer août', 890),
  D(2, 'Abonnements', 'Internet + mobile', 44.9),
  D(3, 'Courses', 'Supermarché', 96.4),
  D(3, 'Logement', 'Assurance habitation', 31.9),
  D(4, 'Transport', 'Essence', 61.2, 'Compte Antoine'),
  D(4, 'Enfants', 'Chaussures Noé', 34.9),
  D(5, 'Courses', 'Boulangerie', 8.7),
  D(5, 'Santé', 'Mutuelle', 78.2),
  D(6, 'Loisirs', 'Piscine en famille', 18),
  D(6, 'Transport', 'Assurance voiture', 62.4),
  D(7, 'Courses', 'Marché', 27.3),
  D(8, 'Restaurant', 'Pizzeria', 42.5),
  D(8, 'Santé', 'Pharmacie', 12.4, 'Compte Clara'),
  D(9, 'Courses', 'Supermarché', 88.15),
  D(9, 'Enfants', 'Périscolaire', 168),
  D(10, 'Enfants', 'Fournitures rentrée', 63.8),
  D(10, 'Transport', 'Péage', 22.6, 'Compte Antoine'),
  D(11, 'Courses', 'Boulangerie', 6.4),
  D(11, 'Loisirs', 'Cinéma', 24),
  D(12, 'Courses', 'Supermarché', 74.9),
  D(12, 'Logement', 'Électricité', 78.3),
  D(13, 'Courses', 'Boucherie', 31.5),
  V(5, 'Compte commun', 'Livret A', 400, 'Épargne du mois'),
  // --- Juillet, pour que l'historique ait de quoi montrer ---
  R(1, 'Salaire', 'Salaire Clara', 1620, 'Compte Clara', 'j'),
  R(1, 'Salaire', 'Salaire Antoine', 1780, 'Compte Antoine', 'j'),
  R(5, 'Aides', 'Allocations familiales', 141.99, 'Compte commun', 'j'),
  V(2, 'Compte Clara', 'Compte commun', 1150, 'Part du compte commun', 'j'),
  V(2, 'Compte Antoine', 'Compte commun', 1300, 'Part du compte commun', 'j'),
  D(2, 'Logement', 'Loyer juillet', 890, 'Compte commun', 'j'),
  D(3, 'Courses', 'Supermarché', 102.7, 'Compte commun', 'j'),
  D(3, 'Logement', 'Assurance habitation', 31.9, 'Compte commun', 'j'),
  D(5, 'Santé', 'Mutuelle', 78.2, 'Compte commun', 'j'),
  D(6, 'Loisirs', 'Parc aquatique', 52, 'Compte commun', 'j'),
  D(6, 'Transport', 'Assurance voiture', 62.4, 'Compte commun', 'j'),
  D(9, 'Courses', 'Supermarché', 91.2, 'Compte commun', 'j'),
  D(9, 'Enfants', 'Périscolaire', 168, 'Compte commun', 'j'),
  D(12, 'Restaurant', 'Crêperie', 38.4, 'Compte commun', 'j'),
  D(15, 'Transport', 'Essence', 58.9, 'Compte Antoine', 'j'),
  D(18, 'Enfants', 'Centre de loisirs', 96, 'Compte commun', 'j'),
  D(22, 'Courses', 'Supermarché', 84.6, 'Compte commun', 'j'),
  D(28, 'Abonnements', 'Internet + mobile', 44.9, 'Compte commun', 'j'),
  V(5, 'Compte commun', 'Livret A', 400, 'Épargne du mois', 'j'),
];
await sql`insert into transactions ${sql(tx)}`;

await sql`insert into echeances ${sql([
  { foyer_id: F, libelle: 'Loyer', date: '02/09/2026', date_iso: '2026-09-02', recurrence: 'Mensuelle', note: '' },
  { foyer_id: F, libelle: 'Assurance habitation', date: '15/09/2026', date_iso: '2026-09-15', recurrence: 'Annuelle', note: '' },
  { foyer_id: F, libelle: 'Cantine — 1er trimestre', date: '20/09/2026', date_iso: '2026-09-20', recurrence: 'Aucune', note: '' },
  { foyer_id: F, libelle: 'Assurance voiture', date: '28/08/2026', date_iso: '2026-08-28', recurrence: 'Annuelle', note: '' },
])}`;

// --- TO-DO & COURSES ---------------------------------------------------------
await sql`insert into taches ${sql([
  { foyer_id: F, statut: 'À faire', tache: 'Inscrire Noé au foot', assigne: 'Antoine', categorie: 'Enfants', priorite: 'Haute', echeance: '20/08/2026', recurrence: 'Aucune', note: '' },
  { foyer_id: F, statut: 'À faire', tache: 'Prendre rendez-vous pédiatre', assigne: 'Clara', categorie: 'Santé', priorite: 'Haute', echeance: '18/08/2026', recurrence: 'Aucune', note: 'Vaccin de Manon' },
  { foyer_id: F, statut: 'En cours', tache: 'Préparer la rentrée', assigne: 'Clara', categorie: 'Enfants', priorite: 'Moyenne', echeance: '30/08/2026', recurrence: 'Aucune', note: '' },
  { foyer_id: F, statut: 'À faire', tache: 'Sortir les poubelles', assigne: 'Antoine', categorie: 'Maison', priorite: 'Basse', echeance: '17/08/2026', recurrence: 'Hebdomadaire', note: '' },
  { foyer_id: F, statut: 'À faire', tache: 'Changer les draps', assigne: '', categorie: 'Maison', priorite: 'Basse', echeance: '16/08/2026', recurrence: 'Hebdomadaire', note: '' },
  { foyer_id: F, statut: 'Fait', tache: 'Réserver le restaurant', assigne: 'Antoine', categorie: 'Loisirs', priorite: 'Moyenne', echeance: '08/08/2026', recurrence: 'Aucune', note: '' },
  { foyer_id: F, statut: 'À faire', tache: 'Déclarer le trimestre URSSAF', assigne: 'Clara', categorie: 'Administratif', priorite: 'Haute', echeance: '31/10/2026', recurrence: 'Aucune', note: '' },
])}`;

await sql`insert into courses ${sql([
  { foyer_id: F, fait: false, article: 'Lait demi-écrémé', quantite: '6 briques', rayon: 'Frais' },
  { foyer_id: F, fait: false, article: 'Pâtes', quantite: '500 g', rayon: 'Épicerie' },
  { foyer_id: F, fait: false, article: 'Tomates', quantite: '1 kg', rayon: 'Fruits & légumes' },
  { foyer_id: F, fait: false, article: 'Courgettes', quantite: '3', rayon: 'Fruits & légumes' },
  { foyer_id: F, fait: false, article: 'Poulet', quantite: '1,2 kg', rayon: 'Boucherie' },
  { foyer_id: F, fait: false, article: 'Yaourts nature', quantite: '12', rayon: 'Frais' },
  { foyer_id: F, fait: false, article: 'Gel douche', quantite: '', rayon: 'Hygiène' },
  { foyer_id: F, fait: false, article: 'Couches taille 4', quantite: '1 paquet', rayon: 'Bébé' },
  { foyer_id: F, fait: true, article: 'Pain de mie', quantite: '', rayon: 'Épicerie' },
  { foyer_id: F, fait: true, article: 'Café', quantite: '250 g', rayon: 'Épicerie' },
  { foyer_id: F, fait: false, article: 'Riz', quantite: '1 kg', rayon: 'Épicerie' },
  { foyer_id: F, fait: false, article: 'Fromage râpé', quantite: '200 g', rayon: 'Frais' },
])}`;

// --- REPAS -------------------------------------------------------------------
const ing = (article, quantite, unite, rayon) => ({ article, quantite, unite, rayon });
const recettes = [
  { nom: 'Gratin de courgettes', categorie: 'Plat', type: 'Végétarien', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: true, bebe_pas_goute: false, note: 'Se congèle très bien.',
    ingredients: [ing('Courgettes', 4, 'pièce(s)', 'Fruits & légumes'), ing('Crème fraîche', 20, 'cl', 'Frais'),
      ing('Fromage râpé', 150, 'g', 'Frais'), ing('Œufs', 2, 'pièce(s)', 'Frais')] },
  { nom: 'Poulet rôti et pommes de terre', categorie: 'Plat', type: 'Viande', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: true, bebe_pas_goute: false, note: '',
    ingredients: [ing('Poulet', 1.2, 'kg', 'Boucherie'), ing('Pommes de terre', 1, 'kg', 'Fruits & légumes'),
      ing('Thym', null, '', 'Épicerie')] },
  { nom: 'Pâtes à la bolognaise', categorie: 'Plat', type: 'Viande', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: true, bebe_pas_goute: false, note: '',
    ingredients: [ing('Pâtes', 500, 'g', 'Épicerie'), ing('Bœuf haché', 400, 'g', 'Boucherie'),
      ing('Tomates pelées', 400, 'g', 'Épicerie'), ing('Oignon', 1, 'pièce(s)', 'Fruits & légumes')] },
  { nom: 'Saumon et riz', categorie: 'Plat', type: 'Poisson', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: false, bebe_pas_goute: true, note: 'Manon n’a pas encore goûté.',
    ingredients: [ing('Pavé de saumon', 4, 'pièce(s)', 'Poissonnerie'), ing('Riz', 300, 'g', 'Épicerie'),
      ing('Citron', 1, 'pièce(s)', 'Fruits & légumes')] },
  { nom: 'Quiche aux poireaux', categorie: 'Plat', type: 'Végétarien', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: false, bebe_pas_goute: false, note: '',
    ingredients: [ing('Pâte brisée', 1, 'pièce(s)', 'Frais'), ing('Poireaux', 3, 'pièce(s)', 'Fruits & légumes'),
      ing('Œufs', 3, 'pièce(s)', 'Frais'), ing('Crème fraîche', 20, 'cl', 'Frais')] },
  { nom: 'Salade de tomates mozzarella', categorie: 'Entrée', type: 'Végétarien', chaud_froid: 'Froid', personnes: 4,
    favori_bebe: false, bebe_pas_goute: false, note: '',
    ingredients: [ing('Tomates', 4, 'pièce(s)', 'Fruits & légumes'), ing('Mozzarella', 250, 'g', 'Frais'),
      ing('Basilic', null, '', 'Fruits & légumes')] },
  { nom: 'Soupe de légumes', categorie: 'Entrée', type: 'Végétarien', chaud_froid: 'Chaud', personnes: 4,
    favori_bebe: true, bebe_pas_goute: false, note: '',
    ingredients: [ing('Carottes', 4, 'pièce(s)', 'Fruits & légumes'), ing('Pommes de terre', 3, 'pièce(s)', 'Fruits & légumes'),
      ing('Poireaux', 2, 'pièce(s)', 'Fruits & légumes')] },
  { nom: 'Compote pomme-poire', categorie: 'Dessert', type: 'Végétarien', chaud_froid: 'Froid', personnes: 4,
    favori_bebe: true, bebe_pas_goute: false, note: 'Sans sucre ajouté.',
    ingredients: [ing('Pommes', 4, 'pièce(s)', 'Fruits & légumes'), ing('Poires', 2, 'pièce(s)', 'Fruits & légumes')] },
  { nom: 'Gâteau au yaourt', categorie: 'Dessert', type: 'Végétarien', chaud_froid: 'Froid', personnes: 6,
    favori_bebe: true, bebe_pas_goute: false, note: 'La recette que Noé fait tout seul.',
    ingredients: [ing('Yaourt nature', 1, 'pièce(s)', 'Frais'), ing('Farine', 300, 'g', 'Épicerie'),
      ing('Sucre', 150, 'g', 'Épicerie'), ing('Œufs', 3, 'pièce(s)', 'Frais')] },
];
await sql`insert into recettes ${sql(recettes.map((x) => ({ foyer_id: F, ...x })))}`;

await sql`insert into semaine ${sql([
  { foyer_id: F, jour: 'Lundi', entree: 'Soupe de légumes', plat: 'Pâtes à la bolognaise', dessert: 'Compote pomme-poire', diner: 'Pâtes à la bolognaise', note: '', personnes: 4 },
  { foyer_id: F, jour: 'Mardi', entree: '', plat: 'Gratin de courgettes', dessert: '', diner: 'Gratin de courgettes', note: '', personnes: 4 },
  { foyer_id: F, jour: 'Mercredi', entree: 'Salade de tomates mozzarella', plat: 'Quiche aux poireaux', dessert: 'Gâteau au yaourt', diner: 'Quiche aux poireaux', note: 'Mercredi sans école', personnes: 4 },
  { foyer_id: F, jour: 'Jeudi', entree: '', plat: 'Saumon et riz', dessert: 'Compote pomme-poire', diner: 'Saumon et riz', note: '', personnes: 4 },
  { foyer_id: F, jour: 'Vendredi', entree: '', plat: 'Poulet rôti et pommes de terre', dessert: '', diner: 'Poulet rôti et pommes de terre', note: '', personnes: 4 },
  { foyer_id: F, jour: 'Samedi', entree: 'Salade de tomates mozzarella', plat: '', dessert: 'Gâteau au yaourt', diner: '', note: 'Restaurant ?', personnes: 4 },
  { foyer_id: F, jour: 'Dimanche', entree: 'Soupe de légumes', plat: 'Gratin de courgettes', dessert: 'Compote pomme-poire', diner: 'Gratin de courgettes', note: 'Mamie vient déjeuner', personnes: 6 },
])}`;

// --- CADEAUX -----------------------------------------------------------------
await sql`insert into occasions ${sql([
  { foyer_id: F, nom: 'Anniversaire Noé', date: '2026-09-12', budget: '120', note: '' },
  { foyer_id: F, nom: 'Noël', date: '2026-12-25', budget: '400', note: '' },
  { foyer_id: F, nom: 'Fête des grands-mères', date: '2027-03-07', budget: '50', note: '' },
])}`;

await sql`insert into cadeaux ${sql([
  { foyer_id: F, pour_qui: 'Noé', occasion: 'Anniversaire Noé', idee: 'Vélo 16 pouces', statut: 'À acheter', budget_prevu: '90', prix_paye: '', partage: '', participation: '', offert_par: 'Clara & Antoine', ou: 'Decathlon', note: '' },
  { foyer_id: F, pour_qui: 'Noé', occasion: 'Anniversaire Noé', idee: 'Casque de vélo', statut: 'Idée', budget_prevu: '25', prix_paye: '', partage: '', participation: '', offert_par: '', ou: '', note: '' },
  { foyer_id: F, pour_qui: 'Manon', occasion: 'Noël', idee: 'Cuisine en bois', statut: 'Idée', budget_prevu: '70', prix_paye: '', partage: 'Oui', participation: 'Avec les grands-parents', offert_par: '', ou: '', note: '' },
  { foyer_id: F, pour_qui: 'Clara', occasion: 'Noël', idee: 'Cours de poterie', statut: 'Commandé', budget_prevu: '80', prix_paye: '80', partage: '', participation: '', offert_par: 'Antoine', ou: 'Atelier du centre-ville', note: '' },
  { foyer_id: F, pour_qui: 'Mamie', occasion: 'Fête des grands-mères', idee: 'Album photo de l’année', statut: 'Idée', budget_prevu: '35', prix_paye: '', partage: '', participation: '', offert_par: '', ou: '', note: 'À commander début février.' },
])}`;

// --- EVENEMENTS --------------------------------------------------------------
const evs = [
  { foyer_id: F, nom: 'Anniversaire de Noé — 6 ans', type: 'Anniversaire', date: '2026-09-12', heure: '15:00', lieu: 'À la maison', budget_prevu: '150', depense: '42', statut: 'En préparation', note: 'Thème dinosaures.', agenda_lien: '' },
  { foyer_id: F, nom: 'Barbecue avec les voisins', type: 'Repas', date: '2026-08-22', heure: '12:30', lieu: 'Jardin', budget_prevu: '60', depense: '0', statut: 'À planifier', note: '', agenda_lien: '' },
  { foyer_id: F, nom: 'Rentrée scolaire', type: 'Famille', date: '2026-09-01', heure: '08:30', lieu: 'École Jean-Moulin', budget_prevu: '0', depense: '0', statut: 'Prêt', note: '', agenda_lien: '' },
];
const insEv = await sql`insert into evenements ${sql(evs)} returning id, nom`;
const anniv = insEv.find((e) => e.nom.startsWith('Anniversaire'));

await sql`insert into ev_invites ${sql([
  { foyer_id: F, evenement_id: anniv.id, nom: 'Famille Petit', rsvp: 'Oui', nb_personnes: 4, note: '' },
  { foyer_id: F, evenement_id: anniv.id, nom: 'Mamie et Papi', rsvp: 'Oui', nb_personnes: 2, note: '' },
  { foyer_id: F, evenement_id: anniv.id, nom: 'Théo (copain d’école)', rsvp: 'Oui', nb_personnes: 1, note: '' },
  { foyer_id: F, evenement_id: anniv.id, nom: 'Famille Roux', rsvp: 'En attente', nb_personnes: 3, note: '' },
])}`;
await sql`insert into ev_checklist ${sql([
  { foyer_id: F, evenement_id: anniv.id, tache: 'Commander le gâteau', responsable: 'Clara', echeance: '05/09/2026', fait: true },
  { foyer_id: F, evenement_id: anniv.id, tache: 'Envoyer les invitations', responsable: 'Clara', echeance: '25/08/2026', fait: true },
  { foyer_id: F, evenement_id: anniv.id, tache: 'Acheter les décorations', responsable: 'Antoine', echeance: '08/09/2026', fait: false },
  { foyer_id: F, evenement_id: anniv.id, tache: 'Préparer les jeux', responsable: 'Antoine', echeance: '11/09/2026', fait: false },
  { foyer_id: F, evenement_id: anniv.id, tache: 'Gonfler les ballons', responsable: '', echeance: '12/09/2026', fait: false },
])}`;
await sql`insert into ev_menu ${sql([
  { foyer_id: F, evenement_id: anniv.id, libelle: 'Gâteau dinosaure', quantite: '1', cout: '28', achete: true },
  { foyer_id: F, evenement_id: anniv.id, libelle: 'Mini-sandwichs', quantite: '30', cout: '14', achete: false },
  { foyer_id: F, evenement_id: anniv.id, libelle: 'Jus de fruits', quantite: '4 bouteilles', cout: '9', achete: false },
])}`;

// --- Verification ------------------------------------------------------------
console.log('\n  contenu du foyer de demonstration :');
for (const t of ['comptes', 'budget_categories', 'transactions', 'echeances', 'taches', 'courses',
                 'recettes', 'semaine', 'occasions', 'cadeaux', 'evenements',
                 'ev_invites', 'ev_checklist', 'ev_menu']) {
  const [{ n }] = await sql`select count(*)::int as n from ${sql(t)} where foyer_id = ${F}`;
  console.log(`     ${t.padEnd(20)} ${String(n).padStart(3)}`);
}

// Soldes recalcules comme le fait le service Budget.
const soldes = await sql`
  select c.nom, c.solde_initial
    + coalesce((select sum(t.montant) from transactions t where t.foyer_id = ${F} and t.compte = c.nom and t.type = 'Revenu'), 0)
    - coalesce((select sum(t.montant) from transactions t where t.foyer_id = ${F} and t.compte = c.nom and t.type in ('Dépense', 'Virement interne')), 0)
    + coalesce((select sum(t.montant) from transactions t where t.foyer_id = ${F} and t.dest = c.nom and t.type = 'Virement interne'), 0)
    as solde
  from comptes c where c.foyer_id = ${F} order by c.ordre`;
console.log('\n  soldes obtenus :');
let total = 0;
for (const s of soldes) { total += Number(s.solde); console.log(`     ${s.nom.padEnd(18)} ${Number(s.solde).toFixed(2).padStart(9)} EUR`); }
console.log(`     ${'TOTAL'.padEnd(18)} ${total.toFixed(2).padStart(9)} EUR`);

// --- MEMBRES DU FOYER --------------------------------------------------------
/*
 * Deux membres de plus : sans eux, « restreindre un dossier aux parents » n'a
 * aucun sens — il n'y aurait personne a qui le cacher. Le foyer de demonstration
 * doit pouvoir montrer la fonctionnalite, pas seulement la contenir.
 *
 * Antoine est un second PARENT (il voit les dossiers sensibles), Noe est
 * l'ENFANT (il ne les voit pas). Adresses en .invalid : ce domaine est reserve
 * par la norme, aucun courriel ne peut y partir par accident.
 */
const membre = async (email, nom, role) => {
  const [u] = await sql`
    insert into utilisateurs (email, nom) values (${email}, ${nom})
    on conflict (email) do update set nom = excluded.nom
    returning id`;
  await sql`insert into membres (foyer_id, utilisateur_id, role)
    values (${F}, ${u.id}, ${role})
    on conflict (foyer_id, utilisateur_id) do nothing`;
  return u.id;
};
const idClara = (await sql`
  select u.id from utilisateurs u join membres m on m.utilisateur_id = u.id
  where m.foyer_id = ${F} and lower(u.email) = ${CIBLE}`)[0].id;
const idAntoine = await membre('antoine.lambert@exemple.invalid', 'Antoine Lambert', 'membre');
const idNoe = await membre('noe.lambert@exemple.invalid', 'Noé Lambert', 'membre');

// --- DOCUMENTS ---------------------------------------------------------------
/*
 * « Papiers » et « Sante » sont restreints aux deux parents : c'est le scenario
 * exact que la fonctionnalite vise (le carnet de sante et le bail ne regardent
 * pas l'enfant). Les autres dossiers restent communs.
 */
await garnirDocuments(sql, F, {
  restreints: {
    Papiers: [idClara, idAntoine],
    Sante: [idClara, idAntoine],
  },
});

console.log(`
  membres du foyer : Clara (proprietaire), Antoine, Noé`);

// Controle : sur un bac a sable dedie, il ne doit exister aucun AUTRE foyer.
// Si ce compteur n'est pas nul, on n'est pas la ou l'on croit.
const [{ n: autres }] = await sql`select count(*)::int as n from foyers where id <> ${F}`;
console.log(`\n  controle — autres foyers sur cette base : ${autres} (attendu 0)`);
await sql.end();
