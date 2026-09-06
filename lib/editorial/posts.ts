import type { ContenuPost } from '@/lib/editorial/schema';

/**
 * CONTENU FIXE DU CALENDRIER ÉDITORIAL — issu de l'audit Instagram du
 * 06/09/2026 et du calendrier de publication préparé en réponse (16 posts,
 * 7 septembre → 3 octobre 2026, 4/semaine : reel lundi/vendredi, carrousel
 * mercredi/samedi).
 *
 * ⚠ CONSTANTE, PAS UNE TABLE. Modifier un hook ou une légende est un geste
 * éditorial (relecture, ajustement de ton) — l'historique de ces changements
 * vit dans git, comme n'importe quel autre texte de l'application. Seul l'ÉTAT
 * de suivi (statut, visuel, résultats) est en base, voir lib/db/schema.ts
 * `editorialPosts`.
 *
 * ⚠ NE PAS RENUMÉROTER. `numero` est la clé qui relie un post à sa ligne d'état
 * en base (`editorial_posts.numero`) — décaler les numéros décrocherait l'état
 * déjà saisi du mauvais post.
 */
export const POSTS_EDITORIAL: ContenuPost[] = [
  {
    numero: 1,
    semaine: 'S1 — La charge invisible',
    date: '07/09/2026',
    jour: 'Lun',
    jourNumero: '7',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'Scène reconnaissable',
    hook: 'Ce que je gère dans ma tête, là, maintenant, pendant que je fais autre chose.',
    visuel: `Texte qui apparaît ligne par ligne sur fond beige, typo serif noire. 18-22 s, musique douce sans paroles.

Lignes qui s'empilent :
· le rappel du pédiatre
· la lessive encore dans la machine
· le cadeau pour ta mère samedi
· l'assurance à renouveler avant le 15
· il n'y a plus de pain pour demain
· et ce qu'on mange jeudi

Dernière frame : « Personne ne m'a demandé de retenir tout ça. Je le retiens quand même. »`,
    legende: `Il n'y a pas de liste. Il n'y a pas de rappel. C'est juste là, en fond, tout le temps.

C'est ça, la charge mentale : ce n'est pas faire les choses, c'est être celui ou celle qui y pense. En permanence. Pour tout le monde.

On a créé Nestync pour que ce fond sonore ait enfin un endroit où se poser — et surtout, pour qu'il ne repose plus sur une seule personne.

Envoie cette vidéo à la personne avec qui tu partages ton foyer. Sans commentaire. Juste pour voir.`,
    cta: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: '',
  },
  {
    numero: 2,
    semaine: 'S1 — La charge invisible',
    date: '09/09/2026',
    jour: 'Mer',
    jourNumero: '9',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'La phrase qui pique',
    hook: 'Il fait la vaisselle. Elle se souvient qu’il faut racheter du liquide vaisselle.',
    visuel: `S1 — le hook
S2 — « L'un exécute. L'autre anticipe. »
S3 — « Faire, ça se voit. Penser à faire, non. »
S4 — la stat Ifop : 65 % contre 4 %
S5 — « Le problème n'est pas la répartition des tâches. C'est la répartition de la charge de s'en souvenir. »
S6 — CTA`,
    legende: `On croit souvent que l'équilibre, c'est « je fais autant que toi ». Mais la fatigue ne vient pas de là.

Elle vient de la petite voix qui tourne en fond : il faut racheter ça, il faut penser à ça, il faut prévoir ça. Cette voix-là, dans la plupart des foyers, elle n'est pas partagée.

65 % des femmes en couple déclarent porter seules la charge du quotidien. 4 % des hommes le déclarent aussi. (Ifop pour News RSE, 2024)

C'est exactement ce qu'on essaie de changer.

Chez vous, c'est qui qui pense à racheter le liquide vaisselle ? 👇`,
    cta: 'Commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: 'La stat va en slide 4, jamais en slide 1 — c’est la leçon de vos posts « 65 % » et « 69 % ».',
  },
  {
    numero: 3,
    semaine: 'S1 — La charge invisible',
    date: '11/09/2026',
    jour: 'Ven',
    jourNumero: '11',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'La phrase qui pique',
    hook: '« Dis-moi ce qu’il y a à faire. »',
    visuel: `Hook plein écran, 3 s.
Coupe — « C'est exactement ça, le problème. »
Coupe — « Parce que devoir te le dire… c'est déjà le travail. »
Total 12-15 s. Fond beige, typo serif, pas de voix.`,
    legende: `C'est une phrase gentille. Elle part d'une bonne intention. Et pourtant elle épuise.

Parce qu'elle transfère l'exécution sans jamais transférer la charge : il faut toujours que quelqu'un tienne la liste, la mette à jour, la distribue et vérifie.

Tant qu'une seule personne tient la liste, il n'y a pas de 50/50.

Tu l'as déjà entendue, cette phrase ? Ou tu l'as déjà dite ? 👇`,
    cta: 'Commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: 'Votre meilleure phrase, écrite par vous le 1er septembre — elle était enterrée dans une légende. Elle passe en hook.',
  },
  {
    numero: 4,
    semaine: 'S1 — La charge invisible',
    date: '12/09/2026',
    jour: 'Sam',
    jourNumero: '12',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'Utile / à enregistrer',
    hook: 'Les 12 choses que personne ne pense à noter.',
    visuel: `S1 — le hook
S2 à S5 — la liste, 3 items par slide :
· les papiers de la voiture
· la date du prochain rappel de vaccin
· le code du digicode de l'école
· la pointure actuelle
· la fin de garantie du lave-linge
· le nom du plombier qui était bien
· l'anniversaire de la nounou
· le mot de passe du compte cantine
· la date du contrôle chaudière
· ce qu'on avait offert l'an dernier
· l'ordonnance des lunettes
· la date d'achat du matelas
S6 — « Si une seule personne les connaît, ce n'est pas une organisation. C'est une dépendance. »`,
    legende: `Aucune de ces informations n'est urgente. Toutes deviennent un problème le jour où on en a besoin — et où la seule personne qui les connaît n'est pas là.

On a fait la liste des 12 qui reviennent le plus souvent. Prends dix minutes ce dimanche pour vérifier combien sont écrites quelque part, plutôt que dans une seule tête.

Enregistre le post pour l'avoir sous la main dimanche soir.`,
    cta: 'Enregistrement',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: 'Premier post conçu pour l’enregistrement. Vous êtes à 1 enregistrement sur 6 posts — c’est la métrique à débloquer.',
  },
  {
    numero: 5,
    semaine: 'S2 — Le dimanche soir',
    date: '14/09/2026',
    jour: 'Lun',
    jourNumero: '14',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'Scène reconnaissable',
    hook: 'POV : dimanche soir, 21h04.',
    visuel: `Plan fixe cuisine ou canapé, lumière basse.
Texte qui s'empile :
· « la semaine commence dans 11 heures »
· « et personne n'a regardé le planning »
· « ni le frigo »
· « ni le sac de sport de mercredi »
Fin : « Le dimanche soir ne devrait pas être un inventaire. »
15-18 s.`,
    legende: `Le dimanche soir, c'est rarement du repos. C'est un inventaire. On repasse mentalement la semaine à venir en cherchant ce qu'on a oublié.

Le pire, c'est que ce moment est presque toujours vécu en solo, pendant que l'autre regarde une série.

Ce qu'on a construit tient en une phrase : que la semaine soit visible par tout le monde, au même endroit, avant qu'elle commence.

Envoie ça à la personne qui partage tes dimanches soirs.`,
    cta: 'Partage DM',
    hashtags:
      '#viedeparents #parentsdebordes #mamandebordee #famillenombreuse #quotidiendemaman #organisation #chargementale #famille',
    note: '',
  },
  {
    numero: 6,
    semaine: 'S2 — Le dimanche soir',
    date: '16/09/2026',
    jour: 'Mer',
    jourNumero: '16',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'Produit, par le problème',
    hook: 'On a testé six applis. On est revenus au post-it sur le frigo.',
    visuel: `S1 — le hook
S2 — « Une pour les courses. Une pour l'agenda. Une pour le budget. »
S3 — « Trois applis = trois endroits où l'info peut manquer. »
S4 — « Et surtout : trois applis que l'autre n'ouvrira jamais. »
S5 — « Le problème n'a jamais été de trouver une appli. C'était de trouver un endroit commun. »
S6 — CTA`,
    legende: `Le post-it sur le frigo a un défaut majeur : il ne se synchronise pas. Mais il a une qualité que la plupart des applis n'ont pas — tout le monde le voit, sans rien installer, sans rien ouvrir.

C'est la barre à passer. Une organisation qui repose sur une seule personne motivée n'est pas une organisation.

Nestync regroupe comptes, agenda, repas, courses et documents au même endroit. Un seul endroit à ouvrir, pour tout le foyer.

Lien en bio — 30 jours d'essai.`,
    cta: 'Lien en bio',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: 'Réécriture de votre post « MARRE de multiplier les applis » (301 vues, 0 clic). Même sujet, cadrage lecteur au lieu de cadrage produit.',
  },
  {
    numero: 7,
    semaine: 'S2 — Le dimanche soir',
    date: '18/09/2026',
    jour: 'Ven',
    jourNumero: '18',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'Produit montré',
    hook: 'Répartir les courses sans en parler. 20 secondes.',
    visuel: `Screen recording silencieux de l'app, doigt visible, format vertical plein écran.
Texte en surimpression à chaque étape. Pas de voix, musique discrète.
Montrer : ajout d'un article — l'autre le voit — il coche.`,
    legende: `Pas de réunion de famille. Pas de « tu peux passer prendre… ». La liste est commune, chacun ajoute, chacun coche.

C'est un petit truc. Mais c'est exactement le genre de micro-négociation qui use quand elle revient trois fois par semaine.

Un module sur sept. Les autres arrivent dans les prochains posts.

Une question sur le fonctionnement ? Pose-la en commentaire, je réponds à tout. 👇`,
    cta: 'Commentaire',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: 'Premier reel produit. Vous êtes à 0 vidéo sur 6 posts — c’est le principal levier de découverte inutilisé.',
  },
  {
    numero: 8,
    semaine: 'S2 — Le dimanche soir',
    date: '19/09/2026',
    jour: 'Sam',
    jourNumero: '19',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'Utile / à enregistrer',
    hook: 'Sept phrases qui veulent dire « je suis épuisée ».',
    visuel: `S1 — le hook
S2 à S5 — une ou deux phrases par slide :
· « Non non, ça va. »
· « Laisse, je vais le faire, c'est plus rapide. »
· « Tu peux juste me dire quand tu rentres ? »
· « J'ai rien fait de la journée. »
· « Je sais plus par où commencer. »
· « Il faudrait qu'on s'organise. »
· « C'est pas grave. »
S6 — « Aucune ne dit aide-moi. Toutes le demandent. »`,
    legende: `On attend rarement le mot « épuisée ». Ce qui arrive avant, ce sont ces phrases-là — les mêmes, dans presque tous les foyers.

Si tu en as reconnu trois ou plus, ce n'est pas une question d'organisation. C'est une question de répartition.

Enregistre ce post. Relis-le quand tu diras la première.

Laquelle tu entends — ou tu dis — le plus souvent ? 👇`,
    cta: 'Enregistrement + commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: 'Format le plus proche de votre meilleur post (1 597 vues) : une liste de micro-faits reconnaissables, sans marque sur la première image.',
  },
  {
    numero: 9,
    semaine: 'S3 — Le 50/50 réel',
    date: '21/09/2026',
    jour: 'Lun',
    jourNumero: '21',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'La phrase qui pique',
    hook: '4 applis. 1 seul foyer. Et personne qui sait où est rangé le bail.',
    visuel: `Hook plein écran 3 s.
Puis chaque appli qui apparaît et disparaît, une par une.
Puis noir.
Puis la dernière phrase. 12-15 s.`,
    legende: `On a longtemps cru que le problème, c'était le manque d'outils. C'est l'inverse : on en a trop, et aucun n'est partagé.

Le résultat est toujours le même. Une personne sait où sont les choses. Les autres demandent.

Regrouper, ce n'est pas une fonctionnalité. C'est la condition pour que l'information cesse d'appartenir à quelqu'un.

Envoie ça à la personne qui te demande toujours où sont les papiers.`,
    cta: 'Partage DM',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: '',
  },
  {
    numero: 10,
    semaine: 'S3 — Le 50/50 réel',
    date: '23/09/2026',
    jour: 'Mer',
    jourNumero: '23',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'Utile / à enregistrer',
    hook: 'Le test des 30 secondes. Posez-vous ces 5 questions ce soir.',
    visuel: `S1 — le hook
S2 — « 1. Qui sait quand passe le prochain contrôle technique ? »
S3 — « 2. Qui sait ce qu'il reste sur le compte commun aujourd'hui ? »
S4 — « 3. Qui sait ce qu'on mange jeudi ? »
S5 — « 4. Qui sait où sont les papiers d'assurance ? »
S6 — « 5. Qui a répondu "moi" aux quatre premières ? »
S7 — « Si c'est toujours la même personne, ce n'est pas de l'organisation. C'est une charge. »`,
    legende: `Cinq questions, trente secondes, à poser à voix haute ce soir.

Ce n'est pas un quiz pour désigner un coupable. C'est un moyen rapide de rendre visible quelque chose qui, par définition, ne se voit pas.

La plupart des couples tombent sur la même réponse quatre fois sur cinq.

Enregistre-le et fais le test ce soir. Puis dis-moi votre score en commentaire. 👇`,
    cta: 'Enregistrement + commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: '« La plupart des couples » est une formulation prudente, pas une statistique. Ne la chiffrez pas sans donnée.',
  },
  {
    numero: 11,
    semaine: 'S3 — Le 50/50 réel',
    date: '25/09/2026',
    jour: 'Ven',
    jourNumero: '25',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'La phrase qui pique',
    hook: 'Ce n’est pas « aider ». C’est « porter ».',
    visuel: `Hook 3 s.
« Aider, c'est intervenir sur la liste de quelqu'un d'autre. »
« Porter, c'est tenir la liste. »
« Tant qu'un seul la tient, l'autre ne fait qu'aider. »
15 s, fond beige, typo serif.`,
    legende: `« Je t'aide » part d'une intention sincère. Mais le mot dit tout : il désigne une tâche qui appartient à l'autre.

Le basculement se fait le jour où les deux personnes tiennent la même liste, la voient, la mettent à jour. Ce n'est plus de l'aide. C'est du partage.

C'est la seule chose que Nestync essaie de rendre possible.

Envoie-le. Sans rien ajouter.`,
    cta: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: '',
  },
  {
    numero: 12,
    semaine: 'S3 — Le 50/50 réel',
    date: '26/09/2026',
    jour: 'Sam',
    jourNumero: '26',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'Coulisses / preuve',
    hook: 'Ce qu’on s’est réparti ce mois-ci. Et ce qui coince encore.',
    visuel: `S1 — le hook
S2-S3 — « Ce qui est vraiment passé de une personne à deux » : 3 exemples concrets de chez vous
S4-S5 — « Ce qui coince encore » : 2 exemples honnêtes
S6 — CTA`,
    legende: `On construit Nestync en l'utilisant chez nous. Voilà où on en est ce mois-ci, sans filtre : ce qui est vraiment passé de « une personne » à « deux », et les deux endroits où ça coince encore.

Si vous testez l'app, ce sont exactement les retours qui nous aident le plus.

Dites-nous ce qui coince chez vous 👇 — on lit tout, et ça alimente directement la suite.`,
    cta: 'Commentaire',
    hashtags:
      '#viedeparents #parentsdebordes #mamandebordee #famillenombreuse #quotidiendemaman #organisation #chargementale #famille',
    note: 'À remplir avec de VRAIS exemples de chez vous. N’inventez pas : la crédibilité de ce format tient entièrement à sa sincérité.',
  },
  {
    numero: 13,
    semaine: 'S4 — Preuve et produit',
    date: '28/09/2026',
    jour: 'Lun',
    jourNumero: '28',
    mois: 'Sept',
    format: 'Reel',
    pilier: 'Scène reconnaissable',
    hook: 'Le jour où on a arrêté de se demander qui fait quoi.',
    visuel: `Hook 3 s.
Puis trois plans très courts du quotidien : frigo, agenda, cartable.
Puis la phrase finale. Musique douce. 15-18 s.`,
    legende: `Ce n'est pas arrivé d'un coup, et il n'y a pas eu de grande discussion. Il s'est juste passé qu'on a arrêté d'avoir la conversation — parce que l'information était au même endroit, visible par les deux.

C'est moins spectaculaire qu'une résolution. C'est surtout beaucoup plus tenable.

Si vous cherchez par où commencer : un seul endroit, deux personnes qui y ont accès. Le reste suit.

Envoie ça à la personne concernée. Elle saura.`,
    cta: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    note: '',
  },
  {
    numero: 14,
    semaine: 'S4 — Preuve et produit',
    date: '30/09/2026',
    jour: 'Mer',
    jourNumero: '30',
    mois: 'Sept',
    format: 'Carrousel',
    pilier: 'La phrase qui pique',
    hook: 'Elle a l’agenda. Il a le budget. Personne n’a la liste de courses.',
    visuel: `S1 — le hook
S2 — « Se répartir les sujets, ce n'est pas se répartir la charge. »
S3 — « Ça crée juste des angles morts. »
S4 — « Et l'angle mort finit toujours par retomber sur la même personne. »
S5 — « Un seul endroit, visible par les deux. C'est tout. »
S6 — CTA`,
    legende: `La répartition par domaines paraît logique — chacun son périmètre. En pratique, elle fabrique des trous : tout ce qui n'appartient à personne finit chez celui ou celle qui remarque en premier.

Et c'est toujours la même personne qui remarque en premier.

Comptes, agenda, repas, courses, documents : au même endroit, pour tout le monde.

Essai 30 jours, lien en bio.`,
    cta: 'Lien en bio',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: 'Réécriture n°2 de votre post « MARRE » — angle « angles morts » plutôt qu’angle « trop d’applis ».',
  },
  {
    numero: 15,
    semaine: 'S4 — Preuve et produit',
    date: '02/10/2026',
    jour: 'Ven',
    jourNumero: '2',
    mois: 'Oct',
    format: 'Reel',
    pilier: 'Produit montré',
    hook: 'Les 7 modules en 25 secondes.',
    visuel: `Screen recording rythmé, une seconde par module.
Nom du module en surimpression à chaque fois. Musique montante.
Dernière frame : le logo + « 30 jours d'essai ».`,
    legende: `Comptes, agenda, repas, courses, documents, tâches, foyer. Sept modules, un seul endroit, autant de personnes que vous voulez.

Pas un compte à créer pour chaque outil. Pas d'export à faire. Pas de tutoriel de vingt minutes.

30 jours pour vous faire un avis — lien en bio.

Une fonctionnalité qui vous manque ? Dites-la-moi en commentaire, c'est comme ça qu'on choisit la suite. 👇`,
    cta: 'Lien en bio + commentaire',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    note: 'Vérifiez le nombre exact de modules avant de publier : votre bio et vos légendes ont annoncé tantôt 7, tantôt 8.',
  },
  {
    numero: 16,
    semaine: 'S4 — Preuve et produit',
    date: '03/10/2026',
    jour: 'Sam',
    jourNumero: '3',
    mois: 'Oct',
    format: 'Carrousel',
    pilier: 'Coulisses / preuve',
    hook: 'Un mois plus tard : ce qui a vraiment changé.',
    visuel: `S1 — le hook
S2 à S4 — trois changements concrets, format avant / après
S5 — « Ce n'est pas "on gagne du temps". C'est "on en parle moins". »
S6 — CTA`,
    legende: `Un mois qu'on publie ici. Voilà ce que les premiers foyers qui utilisent Nestync nous remontent le plus souvent — et ce n'est pas ce qu'on avait prévu.

Ce n'est pas « on gagne du temps ». C'est « on en parle moins ». La charge n'a pas disparu, elle a arrêté d'appartenir à une seule personne.

Si vous voulez tester : 30 jours, lien en bio.

Et si vous nous suivez depuis le début — merci. Dites-moi en commentaire ce que vous voulez voir en octobre. 👇`,
    cta: 'Commentaire + lien en bio',
    hashtags:
      '#viedeparents #parentsdebordes #mamandebordee #famillenombreuse #quotidiendemaman #organisation #chargementale #famille',
    note: 'Ne publiez ce post QUE si vous avez de vrais retours utilisateurs à citer. Sinon, remplacez-le par un bilan de ce que VOUS avez changé chez vous.',
  },
];
