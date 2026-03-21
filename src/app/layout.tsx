import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/language-provider';
import { Web3Provider } from '@/lib/web3-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'DeFi Node Nexus',
  description: 'Precision DeFi node management and yield optimization platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <Web3Provider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
