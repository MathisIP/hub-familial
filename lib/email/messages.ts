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
): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#faf7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2c2430">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
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

/**
 * Bulletin de santé quotidien, envoyé à l'adresse de contact.
 *
 * ⚠ Il part **tous les jours**, même sans alerte. Un bulletin qui n'arriverait
 * qu'en cas de problème ne se distinguerait pas d'un bulletin qui n'arrive plus
 * du tout — panne du service d'e-mail, tâche planifiée qui ne s'exécute plus,
 * clé expirée. Le silence quotidien devient alors lui-même le signal.
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
  invitationsPurgees: number;
  messagesPurges: number;
  relancesEnvoyees: number;
  comptesSupprimes: number;
  suppressionsIgnorees: number;
}): Promise<boolean> {
  const destination = process.env.EMAIL_EXPEDITEUR;
  if (!destination) return false;

  const alerte = b.alertes.length > 0;
  const jour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const lignes = [
    ['Foyers', `${b.foyers} (+${b.nouveauxFoyers24h} en 24 h)`],
    ['Utilisateurs', `${b.utilisateurs} (+${b.nouveauxUtilisateurs24h} en 24 h)`],
    ['Documents stockés', String(b.documents)],
    // ⚠ Deux chiffres distincts, longtemps confondus sous « Agendas connectés » :
    // une personne relie SON compte Google (une autorisation), puis choisit
    // PLUSIEURS calendriers à partager. Afficher l'un en le nommant l'autre
    // donnait un compteur qui ne mesurait pas ce qu'il annonçait.
    ['Comptes Google reliés', String(b.agendasConnectes)],
    ['Calendriers partagés', String(b.calendriersPartages)],
    ['Messages reçus (24 h)', String(b.messages24h)],
    ['Réponse de la base', `${b.latenceBaseMs} ms`],
  ];
  const menage = [
    ['Invitations purgées', String(b.invitationsPurgees)],
    ['Messages purgés', String(b.messagesPurges)],
    ['Relances d’inactivité', String(b.relancesEnvoyees)],
    ['Comptes supprimés', String(b.comptesSupprimes)],
    ['Suppressions écartées', String(b.suppressionsIgnorees)],
  ];

  const texte =
    `Nestync — bulletin du ${jour}\n\n` +
    (alerte ? `⚠ ALERTES\n${b.alertes.map((a) => `  · ${a}`).join('\n')}\n\n` : 'Aucune alerte.\n\n') +
    lignes.map(([k, v]) => `${k.padEnd(24)} ${v}`).join('\n') +
    `\n\nMénage\n` +
    menage.map(([k, v]) => `${k.padEnd(24)} ${v}`).join('\n');

  const tableau = (rows: string[][]) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 12px 5px 0;color:#7a6f78;font-size:14px">${k}</td><td style="padding:5px 0;font-weight:600;font-size:14px">${v}</td></tr>`,
      )
      .join('');

  return envoyerEmail({
    a: destination,
    sujet: `${alerte ? '⚠ ' : ''}Nestync — bulletin du ${jour}`,
    texte,
    html: gabarit(
      `Bulletin du ${jour}`,
      `${
        alerte
          ? `<div style="margin:0 0 18px;padding:12px 14px;background:#fdf0ec;border-radius:8px;border-left:4px solid #c0392b">
               <p style="margin:0 0 6px;font-weight:700;color:#b3543f">À regarder</p>
               ${b.alertes.map((a) => `<p style="margin:0;font-size:14px;line-height:1.5">${a}</p>`).join('')}
             </div>`
          : '<p style="margin:0 0 18px;font-size:14px;color:#7a6f78">Aucune alerte.</p>'
      }
       <table style="border-collapse:collapse;width:100%">${tableau(lignes)}</table>
       <p style="margin:20px 0 6px;font-size:12px;font-weight:700;color:#9b8f96;text-transform:uppercase;letter-spacing:.05em">Ménage</p>
       <table style="border-collapse:collapse;width:100%">${tableau(menage)}</table>`,
      undefined, // pas de bouton : ce relevé ne mène nulle part
      PIED_INTERNE,
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
