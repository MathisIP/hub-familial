/** @type {import('next').NextConfig} */
const nextConfig = {
  // `credentials.json` et les IDs de classeurs ne doivent JAMAIS finir dans le
  // bundle client. Tout l'accès Google passe par lib/google/*, marqué
  // server-only : une importation accidentelle depuis un composant client
  // devient une erreur de compilation plutôt qu'une fuite silencieuse.
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
