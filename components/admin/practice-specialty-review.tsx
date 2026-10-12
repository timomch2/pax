"use client";
import useSWR from "swr";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PracticeForm,
  practiceFetch,
  practiceSend,
} from "@/components/hub/practice-form";
type Proposal = { id: string; name: string; parent: { name: string } | null };
export function PracticeSpecialtyReview() {
  const { data, error, mutate } = useSWR<Proposal[]>(
    "/api/admin/specialties",
    practiceFetch,
  );
  if (error) return <p role="alert">{error.message}</p>;
  if (!data) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="space-y-5">
      {!data.length && <p>No specialty suggestions await review.</p>}
      {data.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>{p.name}</CardTitle>
            <p>{p.parent?.name}</p>
          </CardHeader>
          <CardContent>
            <PracticeForm
              fields={[
                {
                  name: "status",
                  label: "Decision",
                  required: true,
                  options: [
                    { value: "APPROVED", label: "Approve for the shared list" },
                    { value: "REJECTED", label: "Decline suggestion" },
                  ],
                },
                {
                  name: "notes",
                  label: "Review notes",
                  required: true,
                  type: "textarea",
                },
              ]}
              submitLabel="Save review"
              onSubmit={async (v) => {
                await practiceSend(
                  "/api/admin/specialties",
                  { id: p.id, status: v.status, notes: v.notes },
                  "PATCH",
                );
                await mutate();
                toast.success("Specialty reviewed");
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
