import type { Metadata, Viewport } from 'next';
import './globals.css';
import './screens.css';
import { ArtDefs } from '@/components/art/Art';

export const metadata: Metadata = {
  title: 'Fathom — see how anything works',
  description: 'Ask how anything works and watch a fact-checked, hand-inked cutaway voyage of it — the mechanism moving until it clicks, with the real sources cited on the frame. Fathom it.',
  applicationName: 'Fathom',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.png', type: 'image/png' }],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'Fathom — see how anything works',
    description: 'Some things you can’t be told. You have to be shown.',
    type: 'website',
  },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#141C22',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ArtDefs />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
