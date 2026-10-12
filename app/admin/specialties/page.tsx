import { Container } from "@/components/layouts/container";
import { PageHeader } from "@/components/layouts/page-header";
import { PracticeSpecialtyReview } from "@/components/admin/practice-specialty-review";
export default function SpecialtiesPage() {
  return (
    <Container>
      <PageHeader
        title="Practitioner specialties"
        description="Review proposed subspecialties before adding them to the shared list."
      />
      <PracticeSpecialtyReview />
    </Container>
  );
}
