import type {Metadata} from 'next';
import Script from 'next/script';
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
        <Script id="dom-notfound-guard" strategy="beforeInteractive">
          {`(function () {
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;

  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    try {
      return removeChild.call(this, child);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError') {
        return child;
      }
      throw error;
    }
  };

  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    try {
      return insertBefore.call(this, newNode, referenceNode);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError') {
        return this.appendChild(newNode);
      }
      throw error;
    }
  };
})();`}
        </Script>
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
