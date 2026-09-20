export const dynamic = 'force-dynamic';
import { InvoiceDetail } from '@/components/hub-finance/invoice-detail';
export default function Page({ params }: { params: { id: string } }) {
  return <InvoiceDetail invoiceId={params.id} />;
}
