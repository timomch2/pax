import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { PractitionerDirectory } from "@/components/hub/practitioner-directory";
export const metadata = { title: "Find a practitioner | PAX" };
export default function FindPractitionerPage() {
  return (
    <MarketingShell>
      <Container>
        <div className="py-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Book care
          </p>
          <PageHeader
            title="Find a practitioner and request an appointment"
            description="Listed practitioners have reviewed professional licence evidence and have chosen to publish their practice. No PAX account is needed. Leave your name and phone number; the practice will contact you to agree a time."
          />
          <PractitionerDirectory />
        </div>
      </Container>
    </MarketingShell>
  );
}
