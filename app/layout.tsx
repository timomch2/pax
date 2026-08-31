import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { Providers } from '@/components/providers'
import { GoogleAnalytics } from '@/components/google-analytics'
import { WhatsAppFab } from '@/components/whatsapp/whatsapp-fab'
import Script from 'next/script'

export const dynamic = 'force-dynamic';

const dmSans = Outfit({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Outfit({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'PAX Platform — Praxis Exchange',
  description: 'A global public health innovation ecosystem. Practice management for healthcare practitioners.',
  icons: {
    icon: '/favicon.png?v=2',
    shortcut: '/favicon.png?v=2',
    apple: '/apple-touch-icon.png?v=2',
  },
  openGraph: {
    title: 'PAX Platform — Praxis Exchange',
    description: 'A global public health innovation ecosystem.',
    images: ['/og-image.png'],
  },
}

// Tints the browser's address/toolbar bar with the PAX brand colour
// (Safari on macOS/iOS, Chrome on Android).
export const viewport = {
  themeColor: '#FAF8F5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://apps.abacus.ai/chatllm/appllm-lib.js" strategy="afterInteractive" />
        <GoogleAnalytics />
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            {children}
          </Providers>
          <WhatsAppFab />
          <Toaster />
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
