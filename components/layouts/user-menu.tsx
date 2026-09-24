'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { ChevronDown, LogOut, Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProductSwitcher, type ProductsResponse } from '@/components/product-switcher';
import { serviceForPath, SERVICE_PROFILE_PATHS } from '@/lib/service-navigation';
import { roleLabel, tierLabel } from '@/lib/access';

/** The account identity is shared; My Profile follows the service currently being used. */
export function UserMenu() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? '/';
  const { data } = useSWR<ProductsResponse>('/api/products', (url: string) => fetch(url).then(response => response.json()));
  if (!session?.user?.id) return null;
  const user = session.user;
  const firstName = user.name?.trim().split(/\s+/)[0] || 'Account';
  const currentService = serviceForPath(pathname);
  const service = data?.services?.find(item => item.id === currentService);

  const profileHref = service?.profileHref ?? SERVICE_PROFILE_PATHS[currentService];

  return <div className="flex shrink-0 items-center gap-1 sm:gap-2">
    <ProductSwitcher variant="launcher" />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 gap-2 rounded-full px-2 sm:px-3 hover:bg-muted hover:text-foreground" aria-label={`User menu for ${firstName}`}>
          <UserCircle className="!h-6 !w-6 text-primary" aria-hidden="true" />
          <span className="max-w-20 truncate sm:max-w-32">{firstName}</span>
          <ChevronDown className="hidden sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-72 max-w-[calc(100vw-1.5rem)] rounded-xl p-2">
        <DropdownMenuLabel className="space-y-1 p-3">
          <p className="break-words text-base">{user.name || 'PAX member'}</p>
          <p className="break-all text-sm font-normal text-muted-foreground" suppressHydrationWarning>{user.email}</p>
          <p className="text-xs font-normal text-muted-foreground">{roleLabel(user.role)}{user.tier ? ` · ${tierLabel(user.tier)}` : ''}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref && <DropdownMenuItem asChild className="min-h-11 gap-2">
          <a href={profileHref}><UserCircle className="h-4 w-4" aria-hidden="true" /><span>My Profile<span className="block text-xs text-muted-foreground">{service?.label}</span></span></a>
        </DropdownMenuItem>}
        <DropdownMenuItem asChild className="min-h-11 gap-2">
          <a href={data?.accountHref ?? '/account'}><Settings className="h-4 w-4" aria-hidden="true" />Account &amp; security</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => { void signOut({ callbackUrl: data?.logoutHref ?? '/login' }); }}>
          <LogOut className="h-4 w-4" aria-hidden="true" />Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
