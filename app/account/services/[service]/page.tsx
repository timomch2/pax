import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isServiceKey, readAccountServices } from "@/lib/service-enrollment";
import { productUrl } from "@/lib/product-hosts";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { ServiceSetup } from "@/components/account/service-setup";
export const dynamic = "force-dynamic";
export default async function SetupPage({
  params,
}: {
  params: { service: string };
}) {
  if (!isServiceKey(params.service)) notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    redirect(productUrl("accounts", "/login?callbackUrl=/account"));
  const services = await readAccountServices(session.user.id);
  const service = services.find((item) => item.id === params.service)!;
  if (
    service.state !== "ENABLED" ||
    ["UNAVAILABLE", "ACCOUNT_RESTRICTED"].includes(service.access)
  )
    redirect(
      productUrl("accounts", `/account?service=${service.id}#my-services`),
    );
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      registrationVersion: true,
      accountOnboardingCompletedAt: true,
      headline: true,
      organization: true,
      location: true,
      healthAreas: true,
      bio: true,
      linkedinUrl: true,
      practitionerProfile: true,
      marketplaceBuyer: { select: { id: true } },
      marketplaceVendor: { select: { id: true } },
      talentProfile: { select: { userId: true } },
      talentHiringProfiles: { select: { id: true } },
      services: { where: { serviceKey: params.service } },
    },
  });
  if (user.registrationVersion === 1 && !user.accountOnboardingCompletedAt)
    redirect(productUrl("accounts", "/account/onboarding"));
  if (!user.emailVerified)
    return (
      <Container>
        <PageHeader
          title="Verify your email"
          description="Verify your account email before starting service setup."
        />
      </Container>
    );
  if (service.setupStatus === "COMPLETE") redirect(service.href);
  const profile = user.practitionerProfile;
  return (
    <Container size="lg" className="space-y-6">
      <PageHeader
        title={`Set up ${service.label}`}
        description="Complete this service’s details. Your other profiles remain independent."
      />
      <ServiceSetup
        service={params.service}
        initial={{
          choice: user.services[0]?.setupChoice || null,
          buyer: Boolean(user.marketplaceBuyer),
          vendor: Boolean(user.marketplaceVendor),
          career: Boolean(user.talentProfile),
          hiring: Boolean(user.talentHiringProfiles.length),
          community: {
            headline: user.headline || "",
            organization: user.organization || "",
            location: user.location || "",
            healthAreas: user.healthAreas || "",
            bio: user.bio || "",
            linkedinUrl: user.linkedinUrl || "",
          },
          practice: {
            medicalRegNumber: profile?.medicalRegNumber || "",
            specialty: profile?.specialty || "",
            hospital: profile?.hospital || "",
            bio: profile?.bio || "",
            affiliations: profile?.affiliations || "",
            consultationRate: profile?.consultationRate ?? 2500,
          },
        }}
      />
    </Container>
  );
}
