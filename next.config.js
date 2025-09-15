/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration sécurisée pour la production
  eslint: {
    // Autoriser les builds en cas d'avertissements seulement, pas d'erreurs
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Garder la vérification TypeScript active pour la sécurité
    ignoreBuildErrors: false,
  },
  // Activer les routes typées pour une meilleure sécurité de type
  typedRoutes: true,

  // Configuration optimale pour le développement et la production
  poweredByHeader: false, // Masquer l'en-tête X-Powered-By pour la sécurité
  reactStrictMode: true,  // Mode strict React pour détecter les problèmes

  // Configuration des variables d'environnement
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Configuration des en-têtes de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig