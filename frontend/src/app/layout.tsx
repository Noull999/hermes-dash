import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ClientWidgets from '@/components/ui/ClientWidgets';
import BootSequence from '@/components/ui/BootSequence';
import CursorGlow from '@/components/ui/CursorGlow';
import TiltCards from '@/components/ui/TiltCards';

// Display: technical squared HUD face (JARVIS readouts)
const display = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Data: terminal mono for numbers, labels, telemetry
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HERMES // Command HUD',
  description: 'Hermes Agent — holographic command interface',
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hermes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#04060a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${mono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180.png" />
      </head>
      <body className="scroll-smooth">
        {/* Global HUD backdrop layers */}
        <div className="hud-bg" aria-hidden />
        <div className="hud-aurora" aria-hidden />
        <div className="hud-grid" aria-hidden />
        <div className="hud-lines" aria-hidden />
        <div className="hud-scan" aria-hidden />

        {/* Boot sequence (solo primera carga de la sesión) */}
        <BootSequence />

        {/* Spotlight que sigue al cursor (solo desktop) */}
        <CursorGlow />
        {/* Tilt 3D de tarjetas (solo desktop) */}
        <TiltCards />

        <div id="app-root">{children}</div>

        {/* Global widgets: Command Palette + Search Panel */}
        <ClientWidgets />
      </body>
    </html>
  );
}
