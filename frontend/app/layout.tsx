export const metadata = {
  title: 'Brivara Capital',
  description: 'Dashboard UI',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
