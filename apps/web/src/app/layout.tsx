import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment',
  description: 'Technical assessment for candidates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR ?? '#6366f1';
  return (
    <html lang="en" style={{ '--brand': brandColor } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
