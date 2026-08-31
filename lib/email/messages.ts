import 'server-only';
import { urlSite } from '@/lib/config';
import { envoyerEmail } from '@/lib/email';

/**
 * CONTENU DES MESSAGES TRANSACTIONNELS.
 * =====================================
 * Séparé de [lib/email/index.ts] à dessein : changer de fournisseur ne doit pas
 * toucher au contenu, et retoucher un texte ne doit pas toucher au transport.
 *
 * ⚠ **En français uniquement, volontairement.** L'app est bilingue, mais on ne
 * connaît pas la langue du destinataire : une personne qu'on invite n'a pas
 * encore de compte, donc aucune préférence enregistrée. Écrire dans une langue
 * choisie au hasard serait pire que d'assumer le français, qui est le marché
 * visé. À revoir le jour où l'invitation portera une langue explicite.
 *
 * Les gabarits restent **simples et en styles en ligne** : les clients de
 * messagerie ignorent les feuilles de style externes et une bonne partie du CSS
 * moderne. Ce n'est pas le lieu d'une belle architecture CSS.
 */

const MARQUE = '#E8735A'; // corail de la marque — en dur ici car un e-mail n'a pas accès aux variables CSS

const PIED_UTILISATEUR =
  "Tu reçois ce message parce qu'une action te concernant a eu lieu sur Nestync. " +
  "Si tu n'en es pas à l'origine, ignore-le simplement.";

/** Pied de page d'un relevé d'exploitation — destiné à nous, pas à un utilisateur. */
const PIED_INTERNE =
  'Relevé automatique de Nestync, envoyé chaque jour à l’adresse de contact du service.';

/**
 * `pied` : le texte du bas. Par défaut celui destiné aux UTILISATEURS.
 *
 * ⚠ Un relevé qu'on s'envoie à soi-même doit en avoir un autre : sinon il
 * explique à son propre destinataire qu'« une action le concernant a eu lieu »,
 * ce qui n'a aucun sens — et induirait en erreur s'il était transféré.
 */
function gabarit(
  titre: string,
  corps: string,
  bouton?: { texte: string; url: string },
  pied: string = PIED_UTILISATEUR,
  largeurMax: number = 520,
): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#faf7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2c2430">
  <div style="max-width:${largeurMax}px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:${MARQUE}">Nestync</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${titre}</h1>
    ${corps}
    ${
      bouton
        ? `<p style="margin:28px 0"><a href="${bouton.url}" style="display:inline-block;background:${MARQUE};color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:600">${bouton.texte}</a></p>
    <p style="margin:0 0 8px;font-size:13px;color:#7a6f78">Si le bouton ne fonctionne pas, copie ce lien :</p>
    <p style="margin:0;font-size:13px;word-break:break-all"><a href="${bouton.url}" style="color:${MARQUE}">${bouton.url}</a></p>`
        : ''
    }
    <hr style="border:0;border-top:1px solid #ece5e8;margin:28px 0">
    <p style="margin:0;font-size:12px;color:#9b8f96">${pied}</p>
  </div>
</body></html>`;
}

/**
 * Invitation à rejoindre un foyer.
 *
 * ⚠ Le lien contient le jeton : c'est lui qui autorise le rattachement. Il n'est
 * donc **jamais** journalisé, et la page `/rejoindre` vérifie de toute façon que
 * l'adresse connectée correspond à l'adresse invitée.
 */
export async function envoyerInvitation(
  email: string,
  nomFoyer: string,
  jeton: string,
  invitePar?: string | null,
): Promise<boolean> {
  const url = `${urlSite()}/rejoindre?jeton=${jeton}`;
  const de = invitePar ? `${invitePar} t'invite` : 'Tu es invité·e';
  const texte =
    `${de} à rejoindre le foyer « ${nomFoyer} » sur Nestync.\n\n` +
    `Pour accepter : ${url}\n\n` +
    `Nestync réunit au même endroit le budget, les courses, les repas, l'agenda ` +
    `et les documents du foyer.\n\n` +
    `Si tu ne sais pas de quoi il s'agit, ignore ce message.`;

  return envoyerEmail({
    a: email,
    sujet: `${de} à rejoindre « ${nomFoyer} » sur Nestync`,
    texte,
    html: gabarit(
      `${de} à rejoindre « ${nomFoyer} »`,
      `<p style="margin:0;font-size:15px;line-height:1.6">Nestync réunit au même endroit le budget, les courses, les repas,
       l'agenda et les documents du foyer. En acceptant, tu partageras tout cela avec les autres membres.</p>`,
      { texte: 'Rejoindre le foyer', url },
    ),
  });
}

/**
 * Quelqu'un demande à rejoindre le foyer → on prévient le responsable.
 *
 * Sans ce message, une demande pouvait **rester invisible indéfiniment** : rien
 * ne signalait au responsable qu'il y avait quelque chose à accepter, et le
 * demandeur attendait une réponse qui ne venait jamais.
 */
export async function envoyerDemandeAdhesion(
  emailResponsable: string,
  nomFoyer: string,
  demandeur: { email: string; nom?: string | null },
  message: string,
): Promise<boolean> {
  const url = `${urlSite()}/foyer`;
  const qui = demandeur.nom?.trim() || demandeur.email;
  const texte =
    `${qui} demande à rejoindre ton foyer « ${nomFoyer} » sur Nestync.\n\n` +
    `Adresse : ${demandeur.email}\n` +
    (message ? `Message : ${message}\n` : '') +
    `\nAccepter ou refuser : ${url}\n\n` +
    `⚠ N'accepte que si tu connais cette personne : elle aura accès à toutes les ` +
    `données du foyer (budget, documents, agenda).`;

  return envoyerEmail({
    a: emailResponsable,
    sujet: `${qui} demande à rejoindre « ${nomFoyer} »`,
    texte,
    html: gabarit(
      `${qui} demande à rejoindre « ${nomFoyer} »`,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">Adresse : <strong>${demandeur.email}</strong></p>
       ${message ? `<p style="margin:0 0 12px;padding:12px 14px;background:#faf7f5;border-radius:8px;font-size:15px;line-height:1.6">${message}</p>` : ''}
       <p style="margin:0;font-size:15px;line-height:1.6;color:#b3543f"><strong>N'accepte que si tu connais cette personne :</strong>
       elle aura accès à toutes les données du foyer — budget, documents, agenda.</p>`,
      { texte: 'Voir la demande', url },
    ),
  });
}

/**
 * Message reçu via la page d'aide, transmis à l'adresse de contact.
 *
 * ⚠ `replyTo` n'existe pas dans notre couche d'envoi : l'adresse de l'expéditeur
 * est donc placée **en évidence dans le corps**, pour qu'une réponse ne parte pas
 * à l'expéditeur technique (contact@nestync.app) par réflexe de « Répondre ».
 */
export async function envoyerMessageContact(m: {
  email: string;
  nom: string;
  sujet: string;
  message: string;
}): Promise<boolean> {
  const destination = process.env.EMAIL_EXPEDITEUR;
  if (!destination) return false;

  const qui = m.nom || m.email;
  const texte =
    `Nouveau message depuis la page d'aide.\n\n` +
    `De      : ${qui}\n` +
    `Répondre à : ${m.email}\n` +
    `Sujet   : ${m.sujet}\n\n` +
    `${m.message}\n`;

  return envoyerEmail({
    a: destination,
    sujet: `[Nestync – ${m.sujet}] message de ${qui}`,
    texte,
    html: gabarit(
      `Message de ${qui}`,
      `<p style="margin:0 0 6px;font-size:15px">Répondre à : <strong><a href="mailto:${m.email}">${m.email}</a></strong></p>
       <p style="margin:0 0 14px;font-size:14px;color:#7a6f78">Sujet : ${m.sujet}</p>
       <p style="margin:0;padding:14px;background:#faf7f5;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap">${m.message
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')}</p>`,
    ),
  });
}

/** Centimes → « 1 234,50 € », pour le bulletin (mêmes règles que /admin). */
function euros(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/**
 * Bulletin de santé quotidien, envoyé à l'adresse de contact.
 *
 * ⚠ Il part **tous les jours**, même sans alerte. Un bulletin qui n'arriverait
 * qu'en cas de problème ne se distinguerait pas d'un bulletin qui n'arrive plus
 * du tout — panne du service d'e-mail, tâche planifiée qui ne s'exécute plus,
 * clé expirée. Le silence quotidien devient alors lui-même le signal.
 *
 * ⚠ REFONTE DU 30/08/2026 — trois sections (Argent / À faire / Produit) en plus
 * de l'existant, mêmes chiffres et mêmes formules que la console `/admin`
 * (lib/admin/service.ts), calculés côté tâche planifiée dans
 * `bulletinSante()` (lib/maintenance.ts) puisque `chargerAdmin()` est gardé
 * par une session HTTP qu'un cron n'a jamais.
 */
export async function envoyerBulletinSante(b: {
  foyers: number;
  utilisateurs: number;
  nouveauxFoyers24h: number;
  nouveauxUtilisateurs24h: number;
  messages24h: number;
  documents: number;
  agendasConnectes: number;
  calendriersPartages: number;
  latenceBaseMs: number;
  alertes: string[];
  abonnesPayants: number;
  abonnesMensuels: number;
  abonnesAnnuels: number;
  essaisEnCours: number;
  mrrCentimes: number;
  arrCentimes: number;
  chargeMensuelleCentimes: number;
  pointMort: number;
  essaisQuiExpirentBientot: number;
  impayes: number;
  origineSemaine: { libelle: string; n: number }[];
  invitationsPurgees: number;
  messagesPurges: number;
  relancesEnvoyees: number;
  comptesSupprimes: number;
  suppressionsIgnorees: number;
}): Promise<boolean> {
  /*
   * ⚠ VOLONTAIREMENT SÉPARÉE DE `EMAIL_EXPEDITEUR` (30/08/2026). Cette dernière
   * sert DEUX rôles à la fois — adresse d'ENVOI technique de tous les mails de
   * l'app (lib/email/index.ts, `sender.email`) ET destination des messages de
   * contact (`envoyerMessageContact`) — la réutiliser pour le bulletin aurait
   * mélangé un troisième rôle dans une variable déjà surchargée. Repli sur
   * `EMAIL_EXPEDITEUR` si `EMAIL_RAPPORTS` n'est pas posée : le bulletin ne doit
   * jamais cesser de partir faute de config, surtout que son silence est
   * lui-même le signal d'alerte (voir le commentaire de la fonction).
   */
  const destination = process.env.EMAIL_RAPPORTS || process.env.EMAIL_EXPEDITEUR;
  if (!destination) return false;

  const alerte = b.alertes.length > 0;
  const jour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const argent = [
    ['Abonnés payants', `${b.abonnesPayants} (${b.abonnesMensuels} mensuels, ${b.abonnesAnnuels} annuels)`],
    ['Revenu récurrent (MRR)', euros(b.mrrCentimes)],
    ['Projection annuelle (ARR)', euros(b.arrCentimes)],
    ['Charges récurrentes', euros(b.chargeMensuelleCentimes) + ' / mois'],
    ['Point mort', `${b.pointMort} abonné${b.pointMort > 1 ? 's' : ''} mensuel${b.pointMort > 1 ? 's' : ''}`],
  ];
  const aFaire = [
    ['Essais expirant sous 10 j', String(b.essaisQuiExpirentBientot)],
    ['Foyers en impayé', String(b.impayes)],
    ['Messages reçus (24 h)', String(b.messages24h)],
  ];
  const produit = [
    ['Foyers', `${b.foyers} (+${b.nouveauxFoyers24h} en 24 h)`],
    ['Dont en essai', String(b.essaisEnCours)],
    ['Utilisateurs', `${b.utilisateurs} (+${b.nouveauxUtilisateurs24h} en 24 h)`],
    ['Documents stockés', String(b.documents)],
    // ⚠ Deux chiffres distincts, longtemps confondus sous « Agendas connectés » :
    // une personne relie SON compte Google (une autorisation), puis choisit
    // PLUSIEURS calendriers à partager. Afficher l'un en le nommant l'autre
    // donnait un compteur qui ne mesurait pas ce qu'il annonçait.
    ['Comptes Google reliés', String(b.agendasConnectes)],
    ['Calendriers partagés', String(b.calendriersPartages)],
    ['Réponse de la base', `${b.latenceBaseMs} ms`],
  ];
  const origine = b.origineSemaine.map((o) => [o.libelle, String(o.n)]);
  const menage = [
    ['Invitations purgées', String(b.invitationsPurgees)],
    ['Messages purgés', String(b.messagesPurges)],
    ['Relances d’inactivité', String(b.relancesEnvoyees)],
    ['Comptes supprimés', String(b.comptesSupprimes)],
    ['Suppressions écartées', String(b.suppressionsIgnorees)],
  ];

  const versTexte = (rows: string[][]) => rows.map(([k, v]) => `${k.padEnd(28)} ${v}`).join('\n');
  const texte =
    `Nestync — bulletin du ${jour}\n\n` +
    (alerte ? `⚠ ALERTES\n${b.alertes.map((a) => `  · ${a}`).join('\n')}\n\n` : 'Aucune alerte.\n\n') +
    `Argent\n${versTexte(argent)}\n\n` +
    `À faire\n${versTexte(aFaire)}\n\n` +
    `Produit\n${versTexte(produit)}\n\n` +
    (origine.length > 0 ? `Origine des foyers (7 j)\n${versTexte(origine)}\n\n` : '') +
    `Ménage\n${versTexte(menage)}`;

  const tableau = (rows: string[][]) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 12px 5px 0;color:#7a6f78;font-size:14px">${k}</td><td style="padding:5px 0;font-weight:600;font-size:14px">${v}</td></tr>`,
      )
      .join('');

  const section = (titre: string, rows: string[][]) =>
    rows.length === 0
      ? ''
      : `<p style="margin:22px 0 6px;font-size:12px;font-weight:700;color:#9b8f96;text-transform:uppercase;letter-spacing:.05em">${titre}</p>
         <table style="border-collapse:collapse;width:100%">${tableau(rows)}</table>`;

  // Trois chiffres clés, visibles sans lire le détail — la promesse du résumé en tête.
  const resume = `
    <div style="display:flex;gap:10px;margin:0 0 22px;flex-wrap:wrap">
      ${[
        ['MRR', euros(b.mrrCentimes)],
        ['Abonnés payants', String(b.abonnesPayants)],
        ['Foyers', String(b.foyers)],
      ]
        .map(
          ([libelle, valeur]) => `
        <div style="flex:1 1 140px;background:#faf7f5;border-radius:10px;padding:12px 14px">
          <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:${MARQUE}">${valeur}</p>
          <p style="margin:0;font-size:11px;color:#9b8f96;text-transform:uppercase;letter-spacing:.04em">${libelle}</p>
        </div>`,
        )
        .join('')}
    </div>`;

  return envoyerEmail({
    a: destination,
    sujet: `${alerte ? '⚠ ' : ''}Nestync — bulletin du ${jour}`,
    texte,
    html: gabarit(
      `Bulletin du ${jour}`,
      `${resume}
       ${
         alerte
           ? `<div style="margin:0 0 18px;padding:12px 14px;background:#fdf0ec;border-radius:8px;border-left:4px solid #c0392b">
                <p style="margin:0 0 6px;font-weight:700;color:#b3543f">À regarder</p>
                ${b.alertes.map((a) => `<p style="margin:0;font-size:14px;line-height:1.5">${a}</p>`).join('')}
              </div>`
           : '<p style="margin:0 0 18px;font-size:14px;color:#7a6f78">Aucune alerte.</p>'
       }
       ${section('Argent', argent)}
       ${section('À faire', aFaire)}
       ${section('Produit', produit)}
       ${section('Origine des foyers (7 derniers jours)', origine)}
       ${section('Ménage', menage)}`,
      undefined, // pas de bouton : ce relevé ne mène nulle part
      PIED_INTERNE,
      560, // un peu plus large que le gabarit standard : plusieurs sections à aérer
    ),
  });
}

/**
 * Relance avant suppression d'un compte inactif.
 *
 * ⚠ C'est la pièce qui rend la politique de conservation applicable : supprimer
 * un compte sans avoir prévenu serait brutal pour la personne et risqué pour
 * nous. Le message doit donc être **sans ambiguïté sur la date** et indiquer
 * qu'une simple connexion suffit à tout conserver.
 */
export async function envoyerRelanceInactivite(
  email: string,
  nom: string | null,
  dateSuppression: Date,
): Promise<boolean> {
  const quand = dateSuppression.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const url = urlSite();
  const texte =
    `Bonjour${nom ? ` ${nom}` : ''},\n\n` +
    `Ton compte Nestync est inutilisé depuis plus de trois ans. Conformément à notre ` +
    `politique de conservation, il sera supprimé le ${quand}, avec toutes les données ` +
    `de ton foyer.\n\n` +
    `Pour tout conserver, il te suffit de te connecter une fois : ${url}\n\n` +
    `Si tu préfères partir, tu n'as rien à faire.`;

  return envoyerEmail({
    a: email,
    nomDestinataire: nom,
    sujet: 'Ton compte Nestync va être supprimé',
    texte,
    html: gabarit(
      'Ton compte va être supprimé',
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">Ton compte Nestync est inutilisé depuis plus de trois ans.
       Conformément à notre politique de conservation, il sera supprimé le <strong>${quand}</strong>,
       avec toutes les données de ton foyer.</p>
       <p style="margin:0;font-size:15px;line-height:1.6"><strong>Pour tout conserver, connecte-toi une fois.</strong>
       Si tu préfères partir, tu n'as rien à faire.</p>`,
      { texte: 'Conserver mon compte', url },
    ),
  });
}

/**
 * Résiliation : on demande le motif du départ, et on rappelle que les données
 * restent récupérables.
 *
 * ⚠ LE RAPPEL DE RÉCUPÉRATION N'EST PAS DE LA COURTOISIE. Quelqu'un qui résilie
 * pense rarement à ses documents avant de perdre l'accès — bail, carnet de
 * santé, papiers d'identité. C'est le moment exact où il faut le lui dire,
 * pendant qu'il a encore l'e-mail sous les yeux.
 *
 * ⚠ La question du motif est facultative et sans traçage : un lien de contact,
 * pas un formulaire d'enquête avec pixel espion. On demande, on n'instrumente pas.
 */
export async function envoyerResiliation(
  email: string,
  nom: string | null,
  finAcces: Date | null,
): Promise<boolean> {
  const url = urlSite();
  const quand = finAcces
    ? finAcces.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const texte =
    `Bonjour${nom ? ` ${nom}` : ''},\n\n` +
    `Ton abonnement Nestync est résilié` +
    (quand ? `. Tu gardes l'accès jusqu'au ${quand}.` : '.') +
    `\n\n` +
    `Peux-tu nous dire pourquoi tu pars ? Une phrase suffit, et ça nous aide ` +
    `vraiment : ${url}/aide\n\n` +
    `RÉCUPÈRE TES DONNÉES\n` +
    `Avant de partir, tu peux tout télécharger en une fois : tes documents ` +
    `rangés comme dans l'application, ton budget et tes listes au format tableur.\n` +
    `${url}/compte\n\n` +
    `Cet export reste possible même après la fin de ton accès, tant que ton ` +
    `compte existe : connecte-toi et clique sur « Exporter mes données ».\n\n` +
    `Merci d'avoir essayé Nestync.`;

  return envoyerEmail({
    a: email,
    nomDestinataire: nom,
    sujet: 'Ton abonnement Nestync est résilié',
    texte,
    html: gabarit(
      'Ton abonnement est résilié',
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">C'est noté${
        quand ? `, et tu gardes l'accès jusqu'au <strong>${quand}</strong>` : ''
      }.</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6">
         <strong>Peux-tu nous dire pourquoi tu pars&nbsp;?</strong> Une phrase suffit,
         et ça nous aide vraiment à améliorer Nestync&nbsp;:
         <a href="${url}/aide" style="color:#c0392b">nous répondre</a>.
       </p>
       <p style="margin:0 0 6px;font-size:15px;line-height:1.6"><strong>N'oublie pas tes données.</strong></p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6">
         Tu peux tout télécharger en une fois&nbsp;: tes documents rangés comme dans
         l'application, ton budget et tes listes au format tableur, prêts à ouvrir.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#666">
         Cet export reste possible <strong>même après la fin de ton accès</strong>,
         tant que ton compte existe.
       </p>`,
      { texte: 'Récupérer mes données', url: `${url}/compte` },
    ),
  });
}

/**
 * AVIS DE RECONDUCTION D'UN ABONNEMENT ANNUEL — obligation légale.
 *
 * ⚠ CE COURRIEL N'EST PAS UNE COURTOISIE. L'article L. 215-1 du Code de la
 * consommation impose d'informer le consommateur, par écrit et sur support
 * durable, **au plus tôt trois mois et au plus tard un mois** avant le terme,
 * de sa faculté de ne pas reconduire.
 *
 * ⚠ ET LA SANCTION EST AUTOMATIQUE : à défaut, le client peut résilier
 * gratuitement à tout moment à compter de la reconduction, ET se faire
 * rembourser tout ce qui a été prélevé après cette date. Ce n'est pas une
 * amende ponctuelle, c'est un droit qu'il exerce quand il veut — des mois plus
 * tard s'il le souhaite. L'offre annuelle étant celle qu'on met en avant, c'est
 * l'offre majoritaire qui porterait le risque.
 *
 * ⚠ DEUX ENVOIS, ET UN SEUL EST L'AVIS LÉGAL.
 *  · `legal` — à 45 jours. **C'est celui qui satisfait l'obligation.** Envoyé
 *    à un mois et demi : assez tôt pour rester dans la fenêtre légale même si
 *    un envoi échoue et doit être rejoué, assez tard pour que la personne s'en
 *    souvienne au moment de décider.
 *  · `rappel` — à 7 jours. **HORS FENÊTRE LÉGALE, donc sans valeur au regard
 *    de L. 215-1.** C'est un filet : si le premier s'est perdu dans un dossier
 *    indésirable, celui-ci rattrape la personne avant le prélèvement. Ne jamais
 *    le considérer comme l'avis obligatoire, ni supprimer le premier en croyant
 *    que celui-ci suffit.
 */
export async function envoyerAvisReconduction(
  email: string,
  nom: string | null,
  finPeriode: Date,
  montant: string,
  type: 'legal' | 'rappel',
): Promise<boolean> {
  const url = urlSite();
  const quand = finPeriode.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const objet =
    type === 'legal'
      ? `Ton abonnement Nestync se reconduit le ${quand}`
      : `Rappel : reconduction de ton abonnement dans une semaine`;

  const entree =
    type === 'legal'
      ? `Ton abonnement annuel Nestync arrive à son terme le ${quand}. Sauf action de ` +
        `ta part, il se reconduira automatiquement pour un an, au tarif de ${montant}.`
      : `Petit rappel : ton abonnement annuel Nestync se reconduit le ${quand}, ` +
        `pour un an, au tarif de ${montant}.

` +
        // ⚠ Demandé explicitement : dire POURQUOI ce second message existe.
        // Sans cette phrase, il ressemble à une relance commerciale ; avec elle,
        // il se lit comme ce qu'il est — une précaution en faveur du client.
        `Nous t'avions déjà prévenu il y a un mois et demi. Ce second message est ` +
        `une sécurité de dernière minute : il vaut mieux te prévenir deux fois ` +
        `que de te laisser découvrir un prélèvement que tu n'attendais pas.`;

  const texte =
    `Bonjour${nom ? ` ${nom}` : ''},

` +
    entree +
    `

` +
    `TU NE VEUX PAS RECONDUIRE ?
` +
    `Tu peux résilier en trois clics depuis « Mon abonnement », sans avoir à ` +
    `nous écrire ni à te justifier : ${url}/foyer/abonnement

` +
    `Si tu résilies, tu gardes l'accès jusqu'au ${quand}, et tes données ` +
    `restent exportables.

` +
    `Rien à faire si tu souhaites continuer.

` +
    `— Nestync
` +
    `Cet avis t'est adressé au titre de l'article L. 215-1 du Code de la consommation.`;

  // Le corps HTML reprend le texte : un paragraphe par ligne vide, les sauts
  // simples devenant des <br>. Pas de mise en forme propre — cet avis doit se
  // lire pareil dans un client qui refuse le HTML.
  const SAUT = String.fromCharCode(10);
  const html = texte
    .split(SAUT + SAUT)
    .map(
      (par) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${par
          .split(SAUT)
          .join('<br>')}</p>`,
    )
    .join('');

  return envoyerEmail({ a: email, sujet: objet, texte, html: gabarit(objet, html) });
}

/**
 * PRÉVIENT LES AUTRES MEMBRES QU'UN FOYER VA ÊTRE SUPPRIMÉ.
 *
 * ⚠ Envoyé quand le PROPRIÉTAIRE supprime son compte alors que d'autres
 * personnes partagent le foyer. Sa suppression détruit tout en cascade — budget,
 * documents, agenda — y compris ce que les autres ont saisi.
 *
 * ⚠ CE COURRIEL EST LA CONTREPARTIE D'UN DÉLAI DE GRÂCE, il ne sert à rien seul.
 * Avant, la suppression était immédiate : au moment où le message serait arrivé,
 * il n'y aurait plus rien à exporter. C'est le report de la suppression qui rend
 * l'information utile — ne jamais remettre la suppression en immédiat sans
 * retirer ce message, ce serait promettre une fenêtre qui n'existe pas.
 *
 * On ne nomme pas la personne partie : elle a demandé l'effacement de ses
 * données, l'annoncer à d'autres irait contre ce qu'elle vient d'exercer.
 */
export async function envoyerFoyerEnSuppression(
  email: string,
  nom: string | null,
  nomFoyer: string,
  suppressionLe: Date,
): Promise<boolean> {
  const url = urlSite();
  const quand = suppressionLe.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const objet = `Le foyer « ${nomFoyer} » sera supprimé le ${quand}`;

  const texte =
    `Bonjour${nom ? ` ${nom}` : ''},\n\n` +
    `La personne qui gérait le foyer « ${nomFoyer} » vient de supprimer son compte ` +
    `Nestync. Comme elle en était propriétaire, le foyer et toutes ses données seront ` +
    `supprimés le ${quand}.\n\n` +
    `CE QUE TU PEUX FAIRE D'ICI LÀ\n` +
    `Tu gardes l'accès normal jusqu'à cette date. Depuis « Mon compte », tu peux ` +
    `exporter l'intégralité des données du foyer en un fichier : ${url}/foyer/compte\n\n` +
    `Cela comprend le budget, les tâches, les repas, les événements et les cadeaux. ` +
    `Les documents déposés se téléchargent depuis la section Documents.\n\n` +
    `Passé le ${quand}, plus rien ne sera récupérable. Tu pourras créer ton propre ` +
    `foyer et repartir de ton export.\n\n` +
    `— Nestync`;

  const SAUT = String.fromCharCode(10);
  const html = texte
    .split(SAUT + SAUT)
    .map(
      (par) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${par
          .split(SAUT)
          .join('<br>')}</p>`,
    )
    .join('');

  return envoyerEmail({ a: email, nomDestinataire: nom, sujet: objet, texte, html: gabarit(objet, html) });
}

/**
 * Accusé de réception envoyé à la PERSONNE qui a écrit depuis la page d'aide.
 *
 * ⚠ CE N'EST PAS UNE POLITESSE, C'EST SA PREUVE. Le consommateur ne peut saisir
 * le médiateur de la consommation qu'après une **réclamation écrite préalable**
 * restée sans solution. Jusqu'ici, l'envoi du formulaire ne produisait aucune
 * trace de son côté : la ligne existait en base, chez nous, et lui n'avait rien.
 * Il ne pouvait donc établir ni qu'il avait écrit, ni quand — alors que c'est la
 * condition de recevabilité de sa saisine, et que le délai d'un an court à
 * compter de cette date.
 *
 * ⚠ RECOPIER SON MESSAGE, pas seulement confirmer la réception. Un accusé qui
 * dit « nous avons bien reçu votre demande » ne prouve rien de son contenu. En
 * le lui renvoyant daté, l'e-mail devient le support durable de sa réclamation —
 * et lui évite de devoir nous la redemander.
 *
 * ⚠ À COMPLÉTER LE JOUR OÙ LA CONVENTION DE MÉDIATION EST SIGNÉE : ajouter ici
 * le rappel du recours au médiateur (nom, site, adresse postale). Ne PAS le
 * faire avant — annoncer relever d'un médiateur avec lequel aucune convention
 * n'existe est une information fausse, et c'est un manquement qui se constate
 * sans même qu'il y ait litige.
 *
 * N'échoue jamais bruyamment : un accusé qui ne part pas ne doit pas faire
 * échouer l'enregistrement de la demande, qui est le geste utile.
 */
export async function envoyerAccuseReception(m: {
  email: string;
  nom: string;
  sujet: string;
  message: string;
  recu: Date;
}): Promise<boolean> {
  const quand = m.recu.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  });
  const bonjour = m.nom ? `Bonjour ${m.nom},` : 'Bonjour,';
  const objet = LIBELLE_SUJET[m.sujet] ?? m.sujet;

  const texte =
    `${bonjour}\n\n` +
    `Nous avons bien recu votre message du ${quand} (heure de Paris).\n` +
    `Objet : ${objet}\n\n` +
    `Vous trouverez ci-dessous la copie de ce que vous nous avez ecrit. ` +
    `Conservez ce courriel : il date votre demande.\n\n` +
    `---\n${m.message}\n---\n\n` +
    `Nous vous repondons sous 30 jours au plus, et generalement bien avant.\n`;

  const echappe = m.message.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  return envoyerEmail({
    a: m.email,
    sujet: 'Nous avons bien reçu votre message',
    texte,
    html: gabarit(
      'Message bien reçu',
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${bonjour}</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Nous avons bien reçu votre message du <strong>${quand}</strong> (heure de Paris).<br>Objet : <strong>${objet}</strong></p>
       <p style="margin:0 0 8px;font-size:13px;color:#7a6f78">Copie de votre message — conservez ce courriel, il date votre demande :</p>
       <p style="margin:0 0 14px;padding:14px;background:#faf7f5;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap">${echappe}</p>
       <p style="margin:0;font-size:15px;line-height:1.6">Nous vous répondons sous 30 jours au plus, et généralement bien avant.</p>`,
      undefined,
      "Vous recevez ce message parce que vous avez écrit à Nestync depuis la page d'aide.",
    ),
  });
}

/**
 * Libellés lisibles des objets du formulaire.
 * ⚠ Doivent rester alignés sur `SUJETS_CONTACT` (lib/db/schema.ts) et sur les
 * intitulés du formulaire : l'accusé recopie ce que la personne a choisi, et un
 * écart lui ferait douter d'avoir été comprise.
 */
const LIBELLE_SUJET: Record<string, string> = {
  question: 'Une question sur l’application',
  probleme: 'Quelque chose ne fonctionne pas',
  donnees: 'Données personnelles',
  facturation: 'Abonnement ou facturation',
  reclamation: 'Une réclamation',
  autre: 'Autre',
};
