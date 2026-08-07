/** @type {import('next').NextConfig} */
const nextConfig = {
  // `googleapis` reste côté serveur : les jetons OAuth des utilisateurs ne
  // doivent jamais approcher le bundle client. Tout l'accès Google passe par
  // lib/agenda/*, marqué server-only — une importation accidentelle depuis un
  // composant client devient une erreur de compilation, pas une fuite.
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
