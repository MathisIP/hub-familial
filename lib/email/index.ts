import 'server-only';

/**
 * ENVOI D'E-MAILS TRANSACTIONNELS (serveur uniquement) — fournisseur : **Brevo**.
 * ============================================================================
 * Abstraction volontaire, sur le modèle de [lib/stockage/index.ts] : changer de
 * fournisseur (Scaleway, Postmark…) = réécrire **ce seul fichier**. Le reste du
 * code ne connaît que `envoyerEmail()`.
 *
 * **Pourquoi Brevo** : société française, serveurs dans l'Union européenne, DPA
 * fourni d'office. Le registre des traitements y gagne un sous-traitant européen,
 * sans question de transfert hors UE — cohérent avec le reste de l'architecture
 * (base à Francfort, fonctions en `fra1`).
 *
 * ⚠ RÈGLE CENTRALE : **un envoi qui échoue ne doit JAMAIS faire échouer l'action
 * métier.** Inviter quelqu'un doit fonctionner même si Brevo est en panne — le
 * lien d'invitation existe en base et reste copiable à la main. Toutes les
 * fonctions renvoient donc un booléen et n'exceptent pas.
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export type Message = {
  a: string;
  nomDestinataire?: string | null;
  sujet: string;
  html: string;
  /** Version texte : certains clients la préfèrent, et elle évite le classement en indésirable. */
  texte: string;
};

/** L'envoi est-il configuré ? Permet de dégrader proprement dans l'UI. */
/**
 * Envoie un message. Renvoie `true` si Brevo l'a accepté.
 *
 * Ne lève jamais : voir la règle centrale ci-dessus. Les échecs sont journalisés
 * (visibles dans les journaux Vercel) pour rester diagnosticables.
 */
export async function envoyerEmail(m: Message): Promise<boolean> {
  const cle = process.env.BREVO_API_KEY;
  const expediteur = process.env.EMAIL_EXPEDITEUR;
  if (!cle || !expediteur) {
    console.warn('[email] non configuré (BREVO_API_KEY / EMAIL_EXPEDITEUR) — envoi ignoré');
    return false;
  }

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': cle,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: expediteur, name: process.env.EMAIL_EXPEDITEUR_NOM || 'Nestync' },
        to: [{ email: m.a, ...(m.nomDestinataire ? { name: m.nomDestinataire } : {}) }],
        subject: m.sujet,
        htmlContent: m.html,
        textContent: m.texte,
      }),
      // Un fournisseur lent ne doit pas retenir la page de l'utilisateur.
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      // Le corps porte la raison exacte (clé invalide, expéditeur non validé…) :
      // sans lui, un envoi muet serait impossible à diagnostiquer.
      console.error('[email] refus Brevo', r.status, (await r.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] envoi impossible', e instanceof Error ? e.message : e);
    return false;
  }
}
