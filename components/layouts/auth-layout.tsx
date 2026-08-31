import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaxLogo } from '@/components/brand/pax-logo'
import Link from 'next/link'

export function AuthLayout({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF8F5] hero-gradient">
      <div className="w-full max-w-md">
        {/* PAX Branding */}
        <Link href="/" className="flex justify-center mb-8 no-underline">
          <PaxLogo size="md" tone="light" />
        </Link>

        <Card className={cn('w-full shadow-lg border-black/[0.06] bg-white', className)}>
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl tracking-tight">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Praxis Exchange. All rights reserved.
        </p>
      </div>
    </div>
  )
}
