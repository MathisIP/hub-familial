/**
 * Remplace le transport d'e-mails pendant les scripts d'aperçu et de contrôle.
 * `globalThis.__avisEchoue` simule une panne du service — la seule façon de
 * vérifier que le tampon de preuve n'est jamais posé sur un envoi manqué.
 */
globalThis.__avis = [];
module.exports.envoyerEmail = async (m) => {
  if (globalThis.__avisEchoue) return false;
  globalThis.__avis.push(m);
  return true;
};
module.exports.envoiConfigure = () => true;
