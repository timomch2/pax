import { MarketplaceShell } from '@/components/marketplace/marketplace-shell';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceShell>{children}</MarketplaceShell>;
}
