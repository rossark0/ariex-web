import { Providers } from '@/components/providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Neue Haas Grotesk Display Pro — used for the ARIEX wordmark and display headings.
const neueHaas = localFont({
  src: [
    {
      path: '../../public/fonts/neue-haas-grotesk/NHaasGroteskDSPro-45Lt.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/neue-haas-grotesk/NHaasGroteskDSPro-55Rg.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/neue-haas-grotesk/NHaasGroteskDSPro-65Md.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/neue-haas-grotesk/NHaasGroteskDSPro-75Bd.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-neue-haas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ariex AI - Tax Strategy Platform',
  description:
    'A comprehensive web platform for tax strategists to manage clients, documents, payments, and tax strategies with AI assistance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${neueHaas.variable}`}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
