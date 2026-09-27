import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Glorious Gospel of Christ Admin',
    short_name: 'GGC Admin',
    description: 'Secure administration workspace for Glorious Gospel of Christ.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f6f7',
    theme_color: '#142b3f',
    icons: [
      { src: '/ggc.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/ggc.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
