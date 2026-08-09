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

function gabarit(titre: string, corps: string, bouton?: { texte: string; url: string }): string {
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
    <p style="margin:0;font-size:12px;color:#9b8f96">
      Tu reçois ce message parce qu'une action te concernant a eu lieu sur Nestync.
      Si tu n'en es pas à l'origine, ignore-le simplement.
    </p>
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
