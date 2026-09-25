'use client'

import { UserMenu } from '@/components/layouts/user-menu'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MobileServiceNav } from '@/components/layouts/mobile-service-nav'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

export function AppShell({
  sidebar,
  header,
  children,
  className,
  closeSidebarOnNavigate = false,
}: {
  sidebar: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  closeSidebarOnNavigate?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setSidebarOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="pax-app-shell min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Mobile overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-4 lg:hidden" aria-describedby={undefined}>
          <SheetTitle className="sr-only">PAX navigation</SheetTitle>
          <div className="flex h-full flex-col overflow-y-auto pt-6" onClick={event => {
            if (event.target instanceof Element && event.target.closest('a[href]')) setSidebarOpen(false)
          }}>{sidebar}</div>
        </SheetContent>
      </Sheet>

      {/* Sidebar */}
      <aside
        onClick={closeSidebarOnNavigate ? (event) => {
          if (event.target instanceof Element && event.target.closest('a[href]')) setSidebarOpen(false)
        } : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block'
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          {sidebar}
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b border-black/[0.06] bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">{header}</div>
          <UserMenu />
        </header>

        {/* Content */}
        <main className={cn('p-4 sm:p-6 lg:p-8', className)}>
          {children}
        </main>

        {/* Regulatory footer */}
        <div className="border-t border-black/[0.06] px-6 py-3 mt-4">
          <p className="text-[10px] text-gray-500 leading-relaxed text-center">
            PAX is a technology platform and passive intermediary — not a healthcare provider, pharmacy, or broker-dealer.{' '}
            <Link href="/legal" className="text-primary hover:underline">Full disclaimer</Link>
          </p>
        </div>
      </div>
      <MobileServiceNav onMore={() => setSidebarOpen(true)} />
    </div>
  )
}
