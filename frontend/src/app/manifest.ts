import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hermes Dashboard',
    short_name: 'Hermes',
    description: 'Hermes Agent Dashboard — Tu asistente personal con IA',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#00d4ff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
