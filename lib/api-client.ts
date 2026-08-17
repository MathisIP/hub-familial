/**
 * LECTURE DES ERREURS D'API CÔTÉ NAVIGATEUR.
 * ==========================================
 * Pendant client de [lib/api.ts](lib/api.ts), qui fabrique les réponses côté
 * serveur. Ici, on les relit — sans supposer qu'elles sont en JSON.
 *
 * ⚠ POURQUOI CE FICHIER EXISTE (17/08/2026). Partout dans l'app, les composants
 * lisaient l'erreur ainsi :
 *
 *     if (!r.ok) throw new Error((await r.json()).erreur ?? 'Échec.');
 *
 * Ça marche tant que l'erreur vient de NOTRE code. Mais quand elle vient de la
 * plateforme — corps de requête trop gros, fonction tombée, délai dépassé — le
 * corps est une page HTML. `r.json()` lève alors, et **cette exception remplace
 * l'erreur d'origine**. L'utilisateur reçoit un message de parseur à la place de
 * la cause.
 *
 * Sur Safari, ce message est :
 *
 *     The string did not match the expected pattern.
 *
 * Indéchiffrable, et surtout trompeur : il ressemble à un problème de format de
 * fichier alors qu'il ne dit rien d'autre que « ce n'était pas du JSON ». C'est
 * exactement le temps perdu qu'on veut éviter à quelqu'un qui n'a pas accès aux
 * journaux du serveur — c'est-à-dire à tous nos clients.
 */

/** 413 renvoyé par la plateforme quand le corps de la requête dépasse la limite. */
const TROP_GROS = 413;

/**
 * Message d'erreur d'une réponse, quelle que soit la forme du corps.
 *
 * L'ordre compte : on traite d'abord les codes que la plateforme produit
 * elle-même (dont le corps n'est jamais du JSON), puis on tente notre format,
 * puis on se rabat sur un message générique **portant le code HTTP** — sans lui,
 * un rapport d'utilisateur ne permet de rien reconstituer.
 */
export async function erreurDeReponse(r: Response, defaut: string): Promise<string> {
  if (r.status === TROP_GROS) {
    return 'Fichier trop volumineux pour l’envoi. Réessaie avec un fichier plus léger.';
  }

  try {
    const data = (await r.json()) as { erreur?: unknown };
    if (data?.erreur) return String(data.erreur);
  } catch {
    /* Pas du JSON : la plateforme a répondu à notre place. */
  }

  if (r.status === 504 || r.status === 408) {
    return 'L’envoi a pris trop de temps. Réessaie, de préférence en Wi-Fi.';
  }
  return `${defaut} (erreur ${r.status})`;
}

/**
 * Corps d'une réponse attendue en JSON, avec une erreur lisible si elle n'en est
 * pas une. À utiliser quand on lit la réponse AVANT de tester `r.ok`.
 */
export async function jsonOuErreur<T>(r: Response, defaut: string): Promise<T> {
  if (!r.ok) throw new Error(await erreurDeReponse(r, defaut));
  try {
    return (await r.json()) as T;
  } catch {
    throw new Error(`${defaut} (réponse illisible)`);
  }
}
