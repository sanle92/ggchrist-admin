import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'GGC Admin', template: '%s · GGC Admin' },
  description: 'Private administration system for Glorious Gospel of Christ.',
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: '/ggc.png',
  },
};

export const viewport: Viewport = { 
  themeColor: '#142b3f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
