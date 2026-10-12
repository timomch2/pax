"use client";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PracticeForm,
  practiceFetch,
  practiceSend,
} from "@/components/hub/practice-form";
import { moneyToMinor } from "@/lib/practice-money";
type Inquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredDate: string | null;
  clientCode: string | null;
  reason: string | null;
  version: number;
};
type Match = { id: string; name: string; patientCode: string };

export function PracticeInquiries({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const base = `/api/practice/${workspaceId}/inquiries`;
  const { data, error, mutate } = useSWR<Inquiry[]>(base, practiceFetch);
  const [selected, setSelected] = useState<Inquiry | null>(null),
    [matches, setMatches] = useState<Match[]>([]);
  if (error) return <p role="alert">{error.message}</p>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Directory appointment requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Contact the client to agree a time before booking. Phone inquiries are
          unverified; check identity before linking an existing client. No slot
          is reserved until approval.
        </p>
        {!data ? (
          <p>Loading requests…</p>
        ) : !data.length ? (
          <p>No directory requests awaiting review.</p>
        ) : (
          data.map((r) => (
            <div key={r.id} className="rounded-xl bg-muted/40 p-4">
              <strong>{r.name}</strong>
              <p>
                <span suppressHydrationWarning>{r.phone}</span>
                {r.email && (
                  <>
                    {" "}
                    · <span suppressHydrationWarning>{r.email}</span>
                  </>
                )}
              </p>
              <p>
                Preferred date: {r.preferredDate || "To be agreed"}
                {r.clientCode && ` · Client reference: ${r.clientCode}`}
              </p>
              {r.reason && <p>{r.reason}</p>}
              {canManage && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(r);
                    setMatches([]);
                  }}
                >
                  Review directory request
                </Button>
              )}
            </div>
          ))
        )}
        {selected && canManage && (
          <div className="border-t pt-5">
            <h3 className="mb-4 font-semibold">Review {selected.name}</h3>
            <PracticeForm
              key={selected.id}
              fields={[
                {
                  name: "action",
                  label: "Decision",
                  required: true,
                  options: [
                    { value: "APPROVE", label: "Accept and book agreed time" },
                    { value: "DECLINE", label: "Decline" },
                  ],
                },
                {
                  name: "startsAt",
                  label: "Agreed start (Africa/Nairobi)",
                  type: "datetime-local",
                },
                {
                  name: "endsAt",
                  label: "Agreed end (Africa/Nairobi)",
                  type: "datetime-local",
                },
                { name: "fee", label: "Agreed fee (KSh)", value: "0" },
                {
                  name: "patientId",
                  label: "Existing client (check identity first)",
                  options: matches.map((m) => ({
                    value: m.id,
                    label: `${m.name} · ${m.patientCode}`,
                  })),
                },
                {
                  name: "distinctClientReason",
                  label: "Reason this is a different client",
                  type: "textarea",
                },
                {
                  name: "reviewReason",
                  label: "Contact confirmation or decline reason",
                  type: "textarea",
                  required: true,
                },
              ]}
              submitLabel="Save directory request decision"
              onSubmit={async (v) => {
                if (v.action === "APPROVE" && (!v.startsAt || !v.endsAt)) {
                  throw new Error(
                    "Enter the start and end time agreed with the client",
                  );
                }
                const result = await practiceSend<{
                  requiresClientReview?: boolean;
                  matches?: Match[];
                }>(
                  base,
                  {
                    id: selected.id,
                    version: selected.version,
                    action: v.action,
                    reviewReason: v.reviewReason,
                    patientId: v.patientId || null,
                    ...(v.distinctClientReason
                      ? { distinctClientReason: v.distinctClientReason }
                      : {}),
                    ...(v.action === "APPROVE"
                      ? {
                          startsAt: new Date(
                            `${v.startsAt}+03:00`,
                          ).toISOString(),
                          endsAt: new Date(`${v.endsAt}+03:00`).toISOString(),
                          feeMinor: moneyToMinor(v.fee),
                        }
                      : {}),
                  },
                  "PATCH",
                );
                if (result.requiresClientReview) {
                  setMatches(result.matches || []);
                  toast.info("Review matching clients before continuing");
                } else {
                  setSelected(null);
                  await mutate();
                  toast.success("Directory request updated");
                }
              }}
            />
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => setSelected(null)}
            >
              Cancel review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
