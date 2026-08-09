import 'server-only';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messagesContact, SUJETS_CONTACT } from '@/lib/db/schema';
import { ErreurValidation } from '@/lib/erreurs';
import { envoyerMessageContact } from '@/lib/email/messages';

/**
 * MESSAGES DE LA PAGE D'AIDE (serveur uniquement).
 * ================================================
 * Deux effets pour un envoi : la ligne en base (preuve horodatée, suivi du
 * délai de réponse) puis le courriel (pour être averti).
 *
 * ⚠ L'ORDRE COMPTE. On enregistre AVANT d'expédier : si le service d'e-mail est
 * en panne, la demande existe quand même et sera lue plus tard. L'inverse
 * perdrait le message sur une panne passagère — précisément ce qu'on cherche à
 * éviter en cessant de tout faire transiter par une boîte mail.
 */

const MAX_PAR_HEURE = 5;
const LONGUEUR_MAX = 4000;

export type NouveauMessage = {
  email: string;
  nom?: string;
  sujet?: string;
  message: string;
  /** Foyer de l'expéditeur s'il est connecté. */
  foyerId?: string | null;
};

const S = (v: unknown): string => String(v ?? '').trim();

export async function envoyerDemandeAide(entree: NouveauMessage): Promise<void> {
  const email = S(entree.email).toLowerCase();
  const message = S(entree.message);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ErreurValidation('Indique une adresse e-mail valide pour qu’on puisse te répondre.');
  }
  if (message.length < 10) {
    throw new ErreurValidation('Décris ta demande en quelques mots de plus.');
  }
  if (message.length > LONGUEUR_MAX) {
    throw new ErreurValidation('Message trop long : va à l’essentiel, on te répondra pour la suite.');
  }

  const sujet = (SUJETS_CONTACT as readonly string[]).includes(S(entree.sujet))
    ? S(entree.sujet)
    : 'question';

  const d = db();

  /**
   * Garde-fou anti-inondation. Volontairement basé sur l'ADRESSE et non sur l'IP :
   * une IP est une donnée personnelle qu'il faudrait justifier et conserver,
   * alors que l'adresse est déjà dans le message. Ce n'est pas une protection
   * contre un attaquant déterminé — c'est ce qu'il faut pour qu'un formulaire
   * public ne devienne pas une nuisance.
   */
  const depuisUneHeure = new Date(Date.now() - 3_600_000);
  const recents = await d
    .select({ id: messagesContact.id })
    .from(messagesContact)
    .where(and(eq(messagesContact.email, email), gt(messagesContact.creeLe, depuisUneHeure)));
  if (recents.length >= MAX_PAR_HEURE) {
    throw new ErreurValidation('Tu as déjà envoyé plusieurs messages. Laisse-nous le temps de répondre.');
  }

  await d.insert(messagesContact).values({
    foyerId: entree.foyerId ?? null,
    email,
    nom: S(entree.nom).slice(0, 120),
    sujet,
    message,
  });

  // Après l'enregistrement, et sans conséquence si l'envoi échoue.
  await envoyerMessageContact({ email, nom: S(entree.nom), sujet, message });
}
