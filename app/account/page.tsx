export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { AccountSecurity } from "@/components/talent/account-security";
import { AccountServices } from "@/components/account/account-services";
import { readAccountServices } from "@/lib/service-enrollment";
import { productUrl } from "@/lib/product-hosts";
export const metadata = {
  title: "Your PAX account",
  robots: { index: false, follow: false },
};
export default async function AccountPage({ searchParams }: { searchParams: { service?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    redirect(productUrl("accounts", "/login?callbackUrl=/account"));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, mfaEnabled: true, password: true, registrationVersion: true, accountOnboardingCompletedAt: true },
  });
  if (user.registrationVersion === 1 && !user.accountOnboardingCompletedAt) redirect(productUrl('accounts', '/account/onboarding'));
  const services = await readAccountServices(session.user.id);
  return (
    <Container size="md" className="space-y-6">
      <PageHeader
        title="Your PAX account"
        description="One identity across your PAX products."
      />
      <p>
        {user.name} · <span suppressHydrationWarning>{user.email}</span>
      </p>
      <AccountServices userId={session.user.id} initialServices={services} selectedService={searchParams.service} />
      <section id="account-security" aria-label="Account security" className="scroll-mt-20">
      <AccountSecurity
        mfaEnabled={user.mfaEnabled}
        hasPassword={Boolean(user.password)}
      />
      </section>
    </Container>
  );
}
