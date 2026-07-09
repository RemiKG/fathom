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

const PRIMARY_URL = process.env.FATHOM_PRIMARY_URL || 'http://47.84.113.80:3012';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // On the serverless mirror, voyages live for the current session only (ephemeral disk).
  // The persistent deployment keeps the full Logbook — say so honestly.
  const isMirror = !!process.env.VERCEL;
  return (
    <html lang="en">
      <body>
        <ArtDefs />
        {children}
        {isMirror && (
          <div
            style={{
              position: 'fixed', left: 12, bottom: 12, zIndex: 60, maxWidth: 400,
              background: 'rgba(20,28,34,0.92)', color: '#EDE3CB', border: '1px solid rgba(186,148,79,0.55)',
              borderRadius: 8, padding: '7px 11px', fontSize: 12, lineHeight: 1.45, fontFamily: 'Georgia, serif',
            }}
          >
            hosted mirror — voyages you sound here last for this browser session; the keeping Logbook
            runs on the persistent deployment{' '}
            <a href={PRIMARY_URL} style={{ color: '#D9B36C', textDecoration: 'underline' }}>{PRIMARY_URL.replace(/^https?:\/\//, '')}</a>
          </div>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
