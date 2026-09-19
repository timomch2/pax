'use client'

import { ProductSwitcher } from '@/components/product-switcher'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function AppShell({
  sidebar,
  header,
  children,
  className,
}: {
  sidebar: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-black/[0.06] bg-white transition-transform duration-normal ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          {sidebar}
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-black/[0.06] bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          {header}
        </header>

        <div className="px-4 sm:px-6"><ProductSwitcher /></div>

        {/* Content */}
        <main className={cn('p-4 sm:p-6 lg:p-8', className)}>
          {children}
        </main>

        {/* Regulatory footer */}
        <div className="border-t border-black/[0.06] px-6 py-3 mt-4">
          <p className="text-[10px] text-gray-500 leading-relaxed text-center">
            PAX is a technology platform and passive intermediary — not a healthcare provider, pharmacy, or broker-dealer.{' '}
            <Link href="/legal" className="text-[#2D9B94] hover:underline">Full disclaimer</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
