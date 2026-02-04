import '@/styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Client Portal',
  description: 'Daily Client Newsletter manager'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
