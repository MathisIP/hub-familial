import type { ContenuPost } from '@/lib/editorial/schema';

/**
 * CONTENU FIXE DU CALENDRIER ÉDITORIAL — 16 publications, 7 septembre →
 * 3 octobre 2026, 4 par semaine.
 *
 * ⚠ DEUX GÉNÉRATIONS DE CONTENU DANS CE FICHIER.
 *  · Semaine 1 (posts 1-4) : plan initial issu de l'audit Instagram du
 *    06/09/2026, formats `Reel`/`Carrousel` sans distinction de médium.
 *  · Semaines 2 à 4 (posts 5-16) : plan retravaillé le 08/09/2026, qui
 *    distingue quatre médiums (texte, dessin, film — voir `FORMATS_POST`),
 *    introduit les personnages récurrents, et documente pour chaque post ce
 *    qu'il y a à produire (`production`) et pourquoi il est là (`pourquoi`).
 *
 * ⚠ CONSTANTE, PAS UNE TABLE. Modifier un hook ou une légende est un geste
 * éditorial (relecture, ajustement de ton) — l'historique de ces changements
 * vit dans git, comme n'importe quel autre texte de l'application. L'ÉTAT de
 * suivi (statut, visuel, résultats) est en base, voir lib/db/schema.ts
 * `editorialPosts` ; les surcharges de texte saisies dans l'app y vivent aussi
 * et PRIMENT sur ce fichier (voir `chargerPostsEditorial`).
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
    cta: 'Envoie cette vidéo à la personne avec qui tu partages ton foyer.',
    ctaType: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    production: '',
    pourquoi: '',
    note: '',
    verrouille: false,
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
    cta: 'Chez vous, c’est qui qui pense à racheter le liquide vaisselle ? 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    production: '',
    pourquoi: '',
    note: 'La stat va en slide 4, jamais en slide 1 — c’est la leçon de vos posts « 65 % » et « 69 % ».',
    verrouille: false,
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
    cta: 'Tu l’as déjà entendue, cette phrase ? Ou tu l’as déjà dite ? 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    production: '',
    pourquoi: '',
    note: 'Votre meilleure phrase, écrite par vous le 1er septembre — elle était enterrée dans une légende. Elle passe en hook.',
    verrouille: false,
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
    cta: 'Enregistre le post pour l’avoir sous la main dimanche soir.',
    ctaType: 'Enregistrement',
    hashtags:
      '#organisationfamiliale #organisationmaison #maisonorganisee #routinefamiliale #gestiondufoyer #viedefamille #chargementale #famille',
    production: '',
    pourquoi: '',
    note: 'Premier post conçu pour l’enregistrement. Vous êtes à 1 enregistrement sur 6 posts — c’est la métrique à débloquer.',
    verrouille: false,
  },

  /* ===================== SEMAINES 2 À 4 — plan du 08/09/2026 ===================== */

  {
    numero: 5,
    semaine: 'S2 — Le dimanche soir',
    date: '14/09/2026',
    jour: 'Lun',
    jourNumero: '14',
    mois: 'Sept',
    format: 'rf',
    pilier: 'Scène reconnaissable',
    hook: 'POV : dimanche soir, 21h04.',
    visuel: `VERROUILLÉ — scénario déjà écrit avec votre femme, je n'y touche pas.

Rappel de l'intention, pour cohérence avec le reste de la semaine : le dimanche soir n'est pas un moment de repos mais un inventaire mental, et il se vit presque toujours en solo pendant que l'autre décompresse.

Si le scénario tourné s'en éloigne, dites-le-moi : j'ajusterai la légende plutôt que le film.`,
    legende: `Le dimanche soir, c'est rarement du repos. C'est un inventaire. On repasse mentalement la semaine à venir en cherchant ce qu'on a oublié.

Le pire, c'est que ce moment se vit presque toujours en solo, pendant que l'autre regarde une série.

Ce qu'on a construit tient en une phrase : que la semaine soit visible par tout le monde, au même endroit, avant qu'elle commence.

Envoie ça à la personne qui partage tes dimanches soirs.`,
    cta: 'Envoie ça à la personne qui partage tes dimanches soirs.',
    ctaType: 'Partage DM',
    hashtags:
      '#viedeparents #parentsdebordes #famillenombreuse #quotidiendeparents #organisation #chargementale #famille #viedefamille',
    production: 'Tournage déjà planifié. Rien à produire de mon côté.',
    pourquoi:
      'Ouvre la semaine sur du filmé : après un reel typographique le 7 et un carrousel dialogué le 9, le passage à l’image réelle relance l’attention sans changer de territoire.',
    note: 'Seule publication verrouillée du plan. Si la légende ne colle pas au montage final, envoyez-moi le déroulé et je la réécris.',
    verrouille: true,
  },
  {
    numero: 6,
    semaine: 'S2 — Le dimanche soir',
    date: '16/09/2026',
    jour: 'Mer',
    jourNumero: '16',
    mois: 'Sept',
    format: 'cd',
    pilier: 'Présentation des personnages',
    hook: 'Quatre foyers différents.\nLe même dimanche soir.',
    visuel: `Première apparition des personnages. On les présente par leur problème, jamais par leur nom — personne ne s'attache à un personnage qu'on lui présente, on s'attache à celui dans lequel on se reconnaît.

S1 — le hook, sur fond uni, sans dessin. Le texte seul crée l'attente.

S2 — GROUPE 1 [archétype suggéré : jeune couple sans enfant]
Scène : deux personnages devant un frigo ouvert.
Bulle : « On avait dit qu'on ferait les courses ce week-end. »

S3 — GROUPE 2 [archétype suggéré : famille avec enfants en bas âge]
Scène : un personnage debout, un enfant accroché à la jambe, un cartable au sol.
Bulle : « C'est demain la piscine ou jeudi ? »

S4 — GROUPE 3 [archétype suggéré : colocation ou famille recomposée]
Scène : trois personnages, trois post-it sur le mur, aucun identique.
Bulle : « Qui a payé quoi ce mois-ci, déjà ? »

S5 — GROUPE 4 [archétype suggéré : parent solo]
Scène : un personnage seul, assis, tenant une liste plus grande que lui.
Bulle : « Il n'y a personne d'autre à qui demander. »

S6 — retour au texte seul, pleine largeur :
« Ce n'est pas un problème d'organisation.
C'est un problème de mémoire partagée. »

S7 — CTA, texte seul.

Chaque bulle fait UNE phrase. Si elle en fait deux, elle n'est pas assez juste.`,
    legende: `On a dessiné quatre foyers. Ils n'ont ni la même taille, ni le même budget, ni les mêmes horaires.

Et pourtant, le dimanche soir, ils butent tous sur la même chose : une information que quelqu'un doit retenir, et que personne d'autre ne connaît.

Ce n'est pas un problème de motivation. Ce n'est même pas un problème d'organisation — la plupart de ces foyers sont très organisés. C'est un problème de mémoire partagée. Tant que l'info vit dans une seule tête, elle repose sur une seule personne.

Ces quatre-là vont revenir souvent ici. Ils vont râler, oublier des trucs, et parfois trouver des solutions.

Lequel des quatre ressemble le plus au tien ? 1, 2, 3 ou 4 👇`,
    cta: 'Lequel des quatre ressemble le plus au tien ? 1, 2, 3 ou 4 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #organisationfamiliale #viedefamille #couplelife #famille #parentalite #quotidiendeparents',
    production:
      '4 illustrations de scène + 1 visuel de couverture. Format carré 1080×1350 recommandé (4:5 occupe plus de hauteur dans le fil que le carré).',
    pourquoi:
      'Le CTA demande de choisir un chiffre entre 1 et 4. C’est l’action la moins coûteuse qui existe pour un lecteur, et c’est exactement ce qu’il faut pour amorcer une section commentaires vide. Vos six premiers posts n’en ont récolté aucun, parce qu’aucun ne posait de question fermée.',
    note: 'Remplacez les archétypes entre crochets par vos quatre profils réels avant de dessiner. Si vos groupes diffèrent beaucoup de ceux que j’ai supposés, envoyez-les-moi : je réécris les quatre bulles.',
    verrouille: false,
  },
  {
    numero: 7,
    semaine: 'S2 — Le dimanche soir',
    date: '18/09/2026',
    jour: 'Ven',
    jourNumero: '18',
    mois: 'Sept',
    format: 'rf',
    pilier: 'Produit montré, pas raconté',
    hook: 'Ce que je fais maintenant\nquand il n’y a plus de café.',
    visuel: `Reel filmé, 12 à 15 s. Aucune voix. Plan unique ou deux plans maximum.

PLAN 1 (0-4 s) — Placard de cuisine qui s'ouvre. Main qui attrape le paquet de café. Il est vide. Léger temps d'arrêt. Le paquet est reposé.
Texte incrusté : « Ce que je fais maintenant quand il n'y a plus de café. »

PLAN 2 (4-11 s) — Le téléphone sort de la poche. Trois gestes, filmés par-dessus l'épaule, sans zoom sur l'écran : on doit comprendre le geste, pas lire l'interface. Le café est ajouté à la liste commune.
Texte incrusté : « Quatre secondes. »

PLAN 3 (11-15 s) — Le placard se referme. Retour au plan large de la cuisine, vide.
Texte final : « Avant, je me disais que j'y penserais.
Je n'y pensais jamais. »

Filmez à hauteur réelle, lumière naturelle, pas de trépied. La maladresse du cadre est un atout ici : c'est ce qui distingue ce plan d'une pub.`,
    legende: `Il n'y a plus de café. Deux options.

Option 1 : je me dis que j'y penserai. Je n'y pense pas. Quelqu'un d'autre le remarque trois jours plus tard, et c'est cette personne qui finit par le racheter — donc par le porter.

Option 2 : quatre secondes, et l'info sort de ma tête pour aller dans un endroit que nous voyons tous les deux.

C'est tout ce que fait Nestync. Ce n'est pas spectaculaire. C'est juste la différence entre « j'y penserai » et « c'est noté ».

Chez toi, c'est quoi le truc qu'on oublie systématiquement de racheter ? 👇`,
    cta: 'Chez toi, c’est quoi le truc qu’on oublie systématiquement de racheter ? 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#organisationfamiliale #organisationmaison #gestiondufoyer #routinefamiliale #viedefamille #chargementale #famille #couplelife',
    production:
      'Tournage : cuisine, lumière du jour, téléphone à la main. 15 minutes de tournage pour 15 secondes utiles. Prévoir un paquet de café vide.',
    pourquoi:
      'Premier reel filmé produit. On montre le geste, jamais l’interface en gros plan : une démo d’écran fait fuir, un geste quotidien fait rester. Le CTA porte sur une anecdote banale — le taux de réponse est bien meilleur que sur une question d’opinion.',
    note: 'Ne filmez pas l’écran de près. Si l’interface est lisible, le post devient une publicité et la portée organique s’effondre.',
    verrouille: false,
  },
  {
    numero: 8,
    semaine: 'S2 — Le dimanche soir',
    date: '19/09/2026',
    jour: 'Sam',
    jourNumero: '19',
    mois: 'Sept',
    format: 'ct',
    pilier: 'Utile / à enregistrer',
    hook: 'Sept phrases qui veulent dire\n« je n’en peux plus ».\nAucune ne le dit.',
    visuel: `Carrousel typographique, 8 slides. Fond #E7E9E4, serif #141C26.

S1 — le hook, aligné à gauche, grande taille.

S2 à S5 — les sept phrases, deux par slide sauf la dernière. Chaque phrase entre guillemets, centrée, seule, très grande. Beaucoup de blanc autour : le vide fait le poids.

  « Non non, ça va. »
  « Laisse, je vais le faire, c'est plus rapide. »
  « Tu peux juste me dire quand tu rentres ? »
  « J'ai rien fait de la journée. »
  « Je sais plus par où commencer. »
  « Il faudrait qu'on s'organise. »
  « C'est pas grave. »

S6 — « Aucune ne demande de l'aide.
Toutes en demandent. »

S7 — « Si tu en as reconnu trois, ce n'est pas une question d'organisation.
C'est une question de répartition. »

S8 — CTA.

Aucune marque avant la S8.`,
    legende: `On attend rarement d'entendre le mot « épuisé ». Ce qui arrive avant, ce sont ces phrases-là — les mêmes, dans presque tous les foyers.

Elles ont un point commun : elles ferment la conversation au lieu de l'ouvrir. « C'est pas grave » veut dire l'inverse. « Laisse, je vais le faire » veut dire « je n'ai plus la force d'expliquer comment ».

Et à force de fermer, on se retrouve seul à porter — non pas parce que l'autre refuse, mais parce qu'on a arrêté de demander.

Enregistre ce post. Relis-le le jour où tu dis la première.

Laquelle tu entends — ou tu dis — le plus souvent ? 👇`,
    cta: 'Enregistre-le. Laquelle tu entends le plus souvent ? 👇',
    ctaType: 'Enregistrement + commentaire',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    production: '8 visuels typographiques. Réutilise exactement le gabarit du 12 septembre, seul le contenu change.',
    pourquoi:
      'Le format le plus proche de votre meilleure publication (1 597 vues) : des micro-faits reconnaissables, pas d’argument, pas de marque sur la première image. Et c’est un post conçu pour l’enregistrement — vous n’en avez qu’un seul sur toute la vie du compte.',
    note: 'Version volontairement non genrée, contrairement à la précédente mouture. Une phrase qui désigne un coupable se partage beaucoup moins qu’une phrase où chacun se place où il veut.',
    verrouille: false,
  },
  {
    numero: 9,
    semaine: 'S3 — Le 50/50 réel',
    date: '21/09/2026',
    jour: 'Lun',
    jourNumero: '21',
    mois: 'Sept',
    format: 'rt',
    pilier: 'La phrase qui pique',
    hook: '« Je t’aide. »',
    visuel: `Reel typographique, 16 à 18 s. Même gabarit que le 7 septembre : fond #E7E9E4, serif #141C26, apparitions en fondu de 0,3 s, aucune animation superflue.

0,0 → 3,5 s   « Je t'aide. »
3,5 → 6,5 s   Deux mots. Un problème.
6,5 → 10,5 s  « Aider », c'est intervenir sur une liste qui appartient à quelqu'un d'autre.
10,5 → 14,0 s Tant qu'une seule personne tient la liste, l'autre ne fera jamais que passer.
14,0 → 18,0 s Le jour où vous tenez la même liste, le mot disparaît tout seul.

Réutilisez le projet DaVinci du 7 : dupliquez la timeline, remplacez les textes. Les Position Y et les fondus sont déjà réglés.`,
    legende: `« Je t'aide » part d'une bonne intention. C'est même une phrase généreuse.

Mais le mot dit exactement ce qu'il fait : il désigne une tâche qui appartient à l'autre. On aide sur le territoire de quelqu'un. On ne peut pas aider sur le sien.

Tant qu'une seule personne tient la liste — sait ce qu'il y a dessus, dans quel ordre, pour quand — l'autre ne peut structurellement qu'aider. Même avec la meilleure volonté du monde.

Le basculement ne se joue pas dans le nombre de tâches faites. Il se joue le jour où vous êtes deux à savoir ce qu'il y a à faire.

Envoie-le. Sans rien ajouter.`,
    cta: 'Envoie-le. Sans rien ajouter.',
    ctaType: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #viedecouple #organisationfamiliale #famille #parentalite #quotidiendeparents',
    production: 'Duplication de la timeline du 7 septembre dans DaVinci. Une heure maximum.',
    pourquoi:
      'Un seul reel typographique sur les trois semaines : c’est un format qui marche mais qui lasse vite s’il devient la signature. Placé ici, il tranche avec le filmé du 18 et le dessiné du 26.',
    note: '« Envoie-le. Sans rien ajouter. » est volontairement sec. Sur un post qui touche un point sensible dans le couple, plus le CTA est court, plus il est suivi.',
    verrouille: false,
  },
  {
    numero: 10,
    semaine: 'S3 — Le 50/50 réel',
    date: '23/09/2026',
    jour: 'Mer',
    jourNumero: '23',
    mois: 'Sept',
    format: 'ct',
    pilier: 'Utile / à enregistrer',
    hook: 'Cinq questions à poser ce soir.\nTrente secondes.',
    visuel: `Carrousel typographique, 8 slides.

S1 — le hook.

S2 — « 1. Qui sait quand passe le prochain contrôle technique ? »
S3 — « 2. Qui sait ce qu'il reste sur le compte commun, là, maintenant ? »
S4 — « 3. Qui sait ce qu'on mange jeudi ? »
S5 — « 4. Qui sait où sont rangés les papiers d'assurance ? »
S6 — « 5. Qui a répondu "moi" aux quatre premières ? »

S7 — « Si c'est toujours la même personne, ce n'est pas de l'organisation.
C'est une charge. »

S8 — CTA.

Numérotez visiblement : c'est ce qui donne envie d'aller jusqu'au bout du carrousel, et le taux de complétion est un signal fort pour la diffusion.`,
    legende: `Cinq questions, à poser à voix haute ce soir. Ça prend trente secondes.

Ce n'est pas un quiz pour désigner un coupable, et ça ne marche que si personne ne prépare ses réponses. Le but est de rendre visible quelque chose qui, par définition, ne se voit pas : qui détient l'information du foyer.

La cinquième question est la seule qui compte vraiment.

Enregistre le post, fais le test ce soir, et dis-moi votre score en commentaire. 👇`,
    cta: 'Enregistre-le, fais le test ce soir, dis-moi votre score. 👇',
    ctaType: 'Enregistrement + commentaire',
    hashtags:
      '#chargementale #organisationfamiliale #couplelife #viedecouple #gestiondufoyer #famille #parentalite #viedefamille',
    production: '8 visuels typographiques, gabarit existant.',
    pourquoi:
      'Le seul post du plan qui demande une action hors ligne. Un lecteur qui fait le test revient commenter son résultat — c’est le mécanisme de commentaire le plus fiable, bien plus qu’une question d’opinion.',
    note: 'Ne chiffrez pas « la plupart des couples répondent la même chose ». Vous n’avez pas la donnée, et une statistique inventée est le genre de détail qui vous coûterait votre crédibilité sur ce sujet précis.',
    verrouille: false,
  },
  {
    numero: 11,
    semaine: 'S3 — Le 50/50 réel',
    date: '25/09/2026',
    jour: 'Ven',
    jourNumero: '25',
    mois: 'Sept',
    format: 'rf',
    pilier: 'Vie réelle',
    hook: 'La phrase que je ne dis plus.',
    visuel: `Reel filmé, 15 à 18 s. Deux temps nettement séparés.

TEMPS 1 — AVANT (0-8 s)
Plan serré sur une scène de matin : cartable ouvert, affaires éparpillées, café.
Textes incrustés qui s'enchaînent, sur le rythme d'une personne qui interrompt :
  « Tu peux me rappeler… »
  « C'est quel jour déjà… »
  « Tu sais si… »
  « Attends, je te redemande… »

TEMPS 2 — APRÈS (8-18 s)
Coupe franche. Même cuisine, même heure, calme.
Un seul geste : le téléphone consulté, posé, terminé.
Texte final : « Je ne demande plus.
Je regarde. »

Ne jouez pas la scène « avant » de façon caricaturale. Filmez-la telle qu'elle est chez vous : un peu bordélique, pas dramatique. La crédibilité tient à ça.`,
    legende: `Pendant longtemps, ma phrase la plus fréquente le matin commençait par « tu peux me rappeler… ».

Ça partait d'une bonne intention : je voulais participer. Mais chaque fois que je demandais, je renvoyais la charge à l'autre. Je déléguais l'exécution en gardant la question chez elle.

Ce qui a changé n'est pas spectaculaire. L'information a simplement arrêté de vivre dans une seule tête pour vivre dans un endroit que nous regardons tous les deux.

Résultat : je ne demande plus. Je regarde.

Toi, c'est quoi ta phrase du matin ? 👇`,
    cta: 'Toi, c’est quoi ta phrase du matin ? 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#viedeparents #quotidiendeparents #organisationfamiliale #routinefamiliale #chargementale #famille #couplelife #viedefamille',
    production: 'Tournage : cuisine le matin, lumière naturelle. Deux prises, avant et après. Compter 30 minutes.',
    pourquoi:
      'Le format avant/après est le plus lisible qui soit, mais il est aussi le plus facile à rater : s’il sent la publicité, il tombe. D’où la consigne de ne pas surjouer l’avant.',
    note: 'Vous parlez ici à la première personne de votre propre foyer. Ne racontez que ce qui s’est réellement passé chez vous — c’est ce qui rend ce format solide, et c’est aussi ce qui le rend indéfendable s’il est inventé.',
    verrouille: false,
  },
  {
    numero: 12,
    semaine: 'S3 — Le 50/50 réel',
    date: '26/09/2026',
    jour: 'Sam',
    jourNumero: '26',
    mois: 'Sept',
    format: 'cd',
    pilier: 'Scène dessinée',
    hook: '18h47.',
    visuel: `Carrousel dessiné, 8 slides. Une boucle de conversation que tout le monde connaît.

S1 — Un seul chiffre, énorme, sur fond uni : « 18h47. » Pas de dessin. L'heure suffit à installer la scène.

S2 — Deux personnages [GROUPE 2 suggéré], cuisine.
  — « On mange quoi ? »
  — « Je sais pas, et toi ? »

S3 — — « Ce que tu veux. »
     — « Non mais dis, moi ça m'est égal. »

S4 — Un personnage ouvre le frigo. Regard vide.
     Pas de bulle. Juste le frigo ouvert.

S5 — — « Y a des pâtes. »
     — « On en a mangé lundi. »

S6 — Les deux personnages, immobiles, dos à dos.
     « 19h12. »

S7 — Texte seul, pleine largeur :
     « Ce n'est pas une question.
     C'est une boucle. »

S8 — « Une boucle, ça ne se résout pas en discutant.
     Ça se résout en décidant une fois, ailleurs. » + CTA

Le silence de la S4 est la slide la plus importante du carrousel. Ne la remplissez pas.`,
    legende: `Vingt-cinq minutes. C'est le temps moyen que prend, chez nous, la question « on mange quoi ce soir » quand personne n'y a pensé avant.

Ce n'est pas une question difficile. C'est une question qui revient sept fois par semaine, toujours au pire moment, toujours quand les deux personnes sont les plus fatiguées de la journée.

Et comme elle revient, elle finit par être portée par une seule personne — celle qui, un jour, en a eu marre de la boucle et a commencé à décider seule.

Une boucle ne se résout pas dans l'instant. Elle se résout en amont, une fois, à un moment où personne n'a faim.

Chez vous, elle dure combien de temps, cette conversation ? 👇`,
    cta: 'Chez vous, elle dure combien de temps, cette conversation ? 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#quoimangerCesoir #organisationfamiliale #chargementale #viedefamille #couplelife #famille #routinefamiliale #quotidiendeparents',
    production:
      '6 illustrations dont une muette (S4). Réutilise le groupe 2 déjà dessiné le 16 — pas de nouveau personnage à créer.',
    pourquoi:
      'Deuxième sortie des personnages, une semaine après leur présentation. On les retrouve dans une situation précise plutôt que dans un panorama : c’est ce qui les installe comme récurrents. Le CTA appelle un chiffre, donc une réponse en deux secondes.',
    note: 'Le dispositif dialogué a déjà servi le 9 septembre en typographie. Deux semaines d’écart et un médium différent : c’est acceptable. Ne le réutilisez pas avant novembre.',
    verrouille: false,
  },
  {
    numero: 13,
    semaine: 'S4 — Preuve et produit',
    date: '28/09/2026',
    jour: 'Lun',
    jourNumero: '28',
    mois: 'Sept',
    format: 'rf',
    pilier: 'Hybride filmé + personnages',
    hook: 'Il y a quelqu’un qui parle\npendant que tu ranges.',
    visuel: `Reel filmé avec personnages incrustés. 18 à 20 s. C'est la publication la plus ambitieuse du plan.

PRINCIPE — Vos images réelles portent le quotidien. Le personnage dessiné, incrusté dans un coin du cadre, porte la voix intérieure. Deux registres, deux couches, jamais mélangés.

0-3 s    Plan réel : mains qui plient du linge. Texte : « Il y a quelqu'un qui parle pendant que tu ranges. »
3-7 s    Le personnage apparaît en bas à droite, petit. Bulle : « Penser à la sortie scolaire. »
7-10 s   Plan réel : vaisselle. Le personnage suit. Bulle : « Le cadeau, c'est samedi. »
10-13 s  Plan réel : on referme un placard. Bulle : « Il faut rappeler le dentiste. »
13-16 s  Plan réel large, pièce rangée, personne. Le personnage est toujours là, seul dans le cadre.
16-20 s  Le personnage s'efface. Texte final :
         « Elle ne se tait pas parce que tout est rangé.
         Elle se tait quand on n'est plus seul à savoir. »

Le personnage doit rester PETIT et dans un coin. S'il occupe le centre, il devient le sujet — or le sujet, c'est la personne réelle qui range.`,
    legende: `Ranger ne fait pas taire la voix. C'est même l'inverse : on range, et pendant qu'on range, elle déroule tout ce qui n'est pas rangé.

C'est ça, la charge mentale. Pas le travail domestique — le commentaire permanent qui l'accompagne, et qui continue quand le travail est fini.

On a mis six mois à comprendre que le problème n'était pas la répartition des tâches chez nous. Les tâches étaient réparties. C'est la voix qui ne l'était pas.

Elle ne s'arrête pas quand la maison est propre. Elle s'arrête quand quelqu'un d'autre sait aussi.

Envoie-le à la personne qui range avec toi.`,
    cta: 'Envoie-le à la personne qui range avec toi.',
    ctaType: 'Partage DM',
    hashtags:
      '#chargementale #chargementalefamiliale #couplelife #organisationfamiliale #viedefamille #famille #parentalite #quotidiendeparents',
    production:
      'Tournage : 4 plans courts du quotidien, 45 minutes. Illustration : 1 personnage en 4 poses, fond transparent (PNG). Montage : incrustation dans DaVinci, piste vidéo supérieure.',
    pourquoi:
      'C’est la publication qui justifie tout l’investissement dans les personnages : ils deviennent un dispositif narratif, pas une décoration. Et c’est le post le plus partageable du plan — il nomme une expérience que beaucoup vivent sans avoir les mots.',
    note: 'Techniquement le plus lourd du plan. Si le planning déraille, c’est celui-ci qu’il faut décaler, pas les autres — mais gardez-le, c’est le meilleur.',
    verrouille: false,
  },
  {
    numero: 14,
    semaine: 'S4 — Preuve et produit',
    date: '30/09/2026',
    jour: 'Mer',
    jourNumero: '30',
    mois: 'Sept',
    format: 'cd',
    pilier: 'Scène dessinée',
    hook: 'L’un a l’agenda.\nL’autre a le budget.\nPersonne n’a la liste de courses.',
    visuel: `Carrousel dessiné, 7 slides.

S1 — le hook, texte seul.

S2 — Deux personnages [GROUPE 1 ou 3], chacun tenant un objet bien identifiable : un calendrier, un portefeuille. Ils se tiennent chacun d'un côté du cadre.

S3 — Entre eux, au centre, au sol : une liste de courses. Personne ne la regarde.
     Bulle commune : « … »

S4 — La liste grandit. Toujours au sol.
     Texte : « Ce qui n'appartient à personne finit chez celui qui le remarque en premier. »

S5 — L'un des deux personnages se baisse et ramasse la liste. Le même que d'habitude.
     Texte : « Et c'est toujours le même qui remarque en premier. »

S6 — Texte seul : « Se répartir les sujets, ce n'est pas se répartir la charge.
     Ça fabrique juste des angles morts. »

S7 — CTA.

La S5 est le pivot : c'est le moment où le lecteur reconnaît sa propre maison.`,
    legende: `Se répartir par domaines paraît logique. Toi les comptes, moi le planning, chacun son périmètre, personne ne marche sur les pieds de l'autre.

Sauf que la vie d'un foyer ne se découpe pas proprement. Il reste toujours des choses qui n'appartiennent à aucun domaine : le cadeau d'anniversaire, le rendez-vous à décaler, le truc qu'il faut racheter, le mail auquel il faut répondre.

Ces choses-là ne sont dans le périmètre de personne. Alors elles atterrissent chez celui qui les remarque en premier — et c'est presque toujours la même personne.

Comptes, agenda, repas, courses, documents : au même endroit, visibles par tout le monde. C'est le seul moyen de supprimer les angles morts.

Essai 30 jours, lien en bio.`,
    cta: 'Essai 30 jours, lien en bio.',
    ctaType: 'Lien en bio',
    hashtags:
      '#organisationfamiliale #organisationmaison #gestiondufoyer #maisonorganisee #viedefamille #chargementale #famille #couplelife',
    production:
      '5 illustrations. Réutilise des personnages existants. Prévoir l’objet « liste de courses » qui grandit d’une slide à l’autre.',
    pourquoi:
      'Une des trois publications avec lien sortant sur douze. Placée en semaine 4, après trois semaines à donner sans rien demander — c’est le moment où un appel commercial passe le mieux.',
    note: 'Vérifiez le nombre de modules annoncé avant de publier : votre bio dit 7, une de vos anciennes légendes disait 8.',
    verrouille: false,
  },
  {
    numero: 15,
    semaine: 'S4 — Preuve et produit',
    date: '02/10/2026',
    jour: 'Ven',
    jourNumero: '2',
    mois: 'Oct',
    format: 'rf',
    pilier: 'Produit montré',
    hook: 'Sept endroits où l’info de ton foyer\nse perd.',
    visuel: `Reel filmé, 22 à 25 s. Rythme rapide, une seconde par élément.

0-4 s    Texte plein écran : « Sept endroits où l'info de ton foyer se perd. »
4-12 s   Sept plans très courts, filmés chez vous, un par « endroit » :
         un post-it sur le frigo · un SMS non lu · une note vocale · un papier dans une poche ·
         un mail perdu · une capture d'écran · « dans ta tête »
         Chaque plan porte son mot en incrustation.
12-15 s  Coupe. Écran noir une demi-seconde.
15-22 s  Le téléphone, un seul écran, les sept modules qui défilent.
         Texte : « Ou un seul. »
22-25 s  Logo + « 30 jours d'essai ».

Le contraste doit être physique : sept plans agités et dispersés, puis un plan unique et calme.`,
    legende: `Comptes, agenda, repas, courses, documents, tâches, foyer.

Ce ne sont pas sept fonctionnalités. Ce sont sept endroits où, aujourd'hui, l'information de votre foyer est en train de se perdre — sur un post-it, dans un SMS, dans une poche, ou dans la tête d'une seule personne.

Nestync ne fait rien d'extraordinaire. Il les met au même endroit, et il fait en sorte que tout le monde y ait accès.

30 jours pour vous faire un avis, sans carte bancaire. Lien en bio.

Il vous manque quelque chose dans cette liste ? Dites-le en commentaire — c'est comme ça qu'on choisit ce qu'on développe ensuite. 👇`,
    cta: 'Lien en bio. Il vous manque quelque chose dans cette liste ? 👇',
    ctaType: 'Lien en bio + commentaire',
    hashtags:
      '#organisationfamiliale #organisationmaison #gestiondufoyer #maisonorganisee #routinefamiliale #viedefamille #chargementale #famille',
    production:
      'Tournage : 7 plans très courts chez vous, 1 h. Plus une capture d’écran propre de l’app. Montage rythmé.',
    pourquoi:
      'Le seul post franchement produit du plan. Il fonctionne parce qu’il est construit sur le problème (sept endroits où ça se perd) et non sur la fonctionnalité (sept modules) — c’est exactement l’inversion qui manquait à votre post « MARRE de multiplier les applis », qui a fait 301 vues et zéro clic.',
    note: 'CONFIRMEZ LE NOMBRE. Si c’est 8 modules et non 7, tout le reel est faux, y compris le hook.',
    verrouille: false,
  },
  {
    numero: 16,
    semaine: 'S4 — Preuve et produit',
    date: '03/10/2026',
    jour: 'Sam',
    jourNumero: '3',
    mois: 'Oct',
    format: 'ct',
    pilier: 'Coulisses / bilan',
    hook: 'Un mois.\nCe qu’on a appris en publiant ici.',
    visuel: `Carrousel typographique, 8 slides. Transparence de fondateur, sans mise en scène.

S1 — le hook.

S2 — « On pensait que le sujet, c'était l'organisation.
     Ce n'était pas ça. »

S3 — « Le post qui a le mieux marché ne parlait pas de l'app.
     Il listait ce que quelqu'un retient dans sa tête. »
     [Insérez ici le chiffre réel de vues]

S4 — « Le post qui a le moins bien marché commençait par un pourcentage. »

S5 — « Ce que les gens nous ont écrit le plus souvent :
     [à remplir avec un vrai verbatim reçu en commentaire ou en DM] »

S6 — « Ce qu'on change en octobre :
     [1 ou 2 décisions concrètes] »

S7 — « Merci d'être [nombre réel] à nous lire. On a commencé à 27. »

S8 — CTA.

Chaque chiffre de ce carrousel doit être réel. Si vous n'avez pas la donnée, supprimez la slide.`,
    legende: `Un mois qu'on publie ici. Voilà ce qu'on a compris, sans filtre.

On croyait que notre sujet était l'organisation du foyer. Ce n'est pas ça. Les gens qui nous lisent sont déjà organisés — souvent mieux que nous. Ce qui les épuise, ce n'est pas le désordre, c'est d'être la seule personne à savoir.

On a aussi compris que nos publications les plus faibles étaient celles où on parlait de l'application, et les plus fortes celles où on décrivait simplement une scène que tout le monde reconnaît.

Alors on continue dans cette direction.

Dites-moi ce que vous voulez voir en octobre — je lis tout. 👇`,
    cta: 'Dites-moi ce que vous voulez voir en octobre. 👇',
    ctaType: 'Commentaire',
    hashtags:
      '#chargementale #organisationfamiliale #viedefamille #couplelife #famille #parentalite #quotidiendeparents #entrepreneuriat',
    production: '8 visuels typographiques. À écrire en dernier, une fois les chiffres réels du mois disponibles.',
    pourquoi:
      'Un bilan honnête, chiffres réels à l’appui, est le format qui convertit le mieux un lecteur passif en abonné : il donne l’impression d’entrer dans les coulisses. Mais il ne fonctionne que s’il est vrai.',
    note: 'NE PUBLIEZ PAS CE POST AVEC DES CHIFFRES INVENTÉS OU DES VERBATIMS FABRIQUÉS. Sur un compte qui parle de charge mentale et de confiance dans le couple, un faux témoignage est le seul type d’erreur dont vous ne vous relèveriez pas. Si vous n’avez pas de retours à citer le 3 octobre, remplacez la S5 par ce que VOUS avez changé chez vous.',
    verrouille: false,
  },
];
