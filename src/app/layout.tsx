import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/language-provider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { RuntimeStabilityGuard } from '@/components/runtime-stability-guard';
import { Web3Providers } from '@/components/web3-providers';

export const metadata: Metadata = {
  title: 'Truth Oracle',
  description: 'Truth Oracle blockchain analytics and yield platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Web3Providers>
            <LanguageProvider>
              <RuntimeStabilityGuard />
              {children}
              <Toaster />
            </LanguageProvider>
          </Web3Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
