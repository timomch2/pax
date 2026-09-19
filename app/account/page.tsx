export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { AccountSecurity } from "@/components/talent/account-security";
import { productUrl } from "@/lib/product-hosts";
export const metadata = {
  title: "Your PAX account",
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    redirect(productUrl("accounts", "/login?callbackUrl=/account"));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, mfaEnabled: true, password: true },
  });
  return (
    <Container size="md" className="space-y-6 py-8">
      <PageHeader
        title="Your PAX account"
        description="One identity across your PAX products."
      />
      <div className="flex flex-wrap gap-5 text-sm">
        <a
          className="text-primary underline"
          href={productUrl("talent", "/talent")}
        >
          Open Talent
        </a>
        <a
          className="text-primary underline"
          href={productUrl("practice", "/dashboard/practice")}
        >
          Open Practice
        </a>
        <a className="text-primary underline" href={productUrl("main", "/")}>
          Main PAX platform
        </a>
      </div>
      <p>
        {user.name} · <span suppressHydrationWarning>{user.email}</span>
      </p>
      <AccountSecurity
        mfaEnabled={user.mfaEnabled}
        hasPassword={Boolean(user.password)}
      />
    </Container>
  );
}
