import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/contexts/auth/components/auth-provider';
import { ORPCProvider } from '@/orpc/react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ariex AI - Tax Strategy Platform',
  description:
    'A comprehensive web platform for tax strategists to manage clients, documents, payments, and tax strategies with AI assistance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ORPCProvider>
            <AuthProvider>{children}</AuthProvider>
          </ORPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
