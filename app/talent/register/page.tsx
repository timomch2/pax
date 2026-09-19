export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { TalentRegister } from "@/components/talent/register";
import { talentEnabled } from "@/lib/product-hosts";
export default function Page() {
  if (!talentEnabled()) notFound();
  return (
    <AuthLayout
      title="Join PAX Talent"
      description="One PAX account for your professional journey"
    >
      <TalentRegister />
    </AuthLayout>
  );
}
