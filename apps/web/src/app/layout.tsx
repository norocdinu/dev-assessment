import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppThemeProvider } from '@/components/ThemeProvider';

// Candidate "Editorial Exam Hall" type system. Exposed as CSS variables on
// <html> so they are available app-wide, but only *applied* inside the
// candidate section (.candidate-root) — the admin app keeps its own typography.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment',
  description: 'Technical assessment for candidates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR ?? '#6366f1';
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable}`}
      style={{ '--brand': brandColor } as React.CSSProperties}
    >
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
