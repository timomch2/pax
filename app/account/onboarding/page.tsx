import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productUrl } from "@/lib/product-hosts";
import { RegisterForm } from "@/components/auth/register-form";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
export const dynamic = "force-dynamic";
export default async function AccountOnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    redirect(productUrl("accounts", "/login?callbackUrl=/account/onboarding"));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      country: true,
      physicalAddress: true,
      city: true,
      postalCode: true,
      registrationVersion: true,
      accountOnboardingCompletedAt: true,
    },
  });
  if (user.registrationVersion !== 1 || user.accountOnboardingCompletedAt)
    redirect(productUrl("accounts", "/account"));
  return (
    <Container size="sm">
      <PageHeader
        title="Complete your PAX account"
        description="One account. Choose the services you want to use."
      />
      <RegisterForm account={user} />
    </Container>
  );
}
