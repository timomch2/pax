"use client";
import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { practiceFetch, practiceSend } from "@/components/hub/practice-form";

const schema = yup.object({
  specialty: yup.string().required("Specialty is required").max(200),
  specialtyGroupId: yup.string().defined(),
  specialtyId: yup.string().defined(),
  hospital: yup.string().defined().max(200),
  consultationRate: yup
    .number()
    .typeError("Enter a valid rate")
    .integer()
    .min(0)
    .max(20000000)
    .required(),
  affiliations: yup.string().defined().max(2000),
  bio: yup.string().defined().max(5000),
  practiceAddress: yup.string().defined().max(300),
  practiceTown: yup.string().defined().max(120),
  practiceCounty: yup.string().defined().max(120),
  latitude: yup.string().defined(),
  longitude: yup.string().defined(),
  directoryEnabled: yup.boolean().defined(),
});
type Values = yup.InferType<typeof schema>;
type ProfileData = Record<string, string | number | boolean | null>;
type Specialty = {
  id: string;
  name: string;
  parentId: string | null;
  status: string;
};

export function PracticeProfileEditor({
  data,
  disabled,
  onSaved,
}: {
  data: ProfileData;
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const { data: specialties, mutate: refreshSpecialties } = useSWR<Specialty[]>(
    "/api/practice/specialties",
    practiceFetch,
  );
  const [proposal, setProposal] = useState(""),
    [proposing, setProposing] = useState(false),
    [locating, setLocating] = useState(false);
  const form = useForm<Values>({
    resolver: yupResolver(schema),
    defaultValues: {
      specialty: String(data.specialty || ""),
      specialtyGroupId: String(data.specialtyGroupId || ""),
      specialtyId: String(data.specialtyId || ""),
      hospital: String(data.hospital || ""),
      consultationRate: Number(data.consultationRate ?? 0),
      affiliations: String(data.affiliations || ""),
      bio: String(data.bio || ""),
      practiceAddress: String(data.practiceAddress || ""),
      practiceTown: String(data.practiceTown || ""),
      practiceCounty: String(data.practiceCounty || ""),
      latitude: data.latitude == null ? "" : String(data.latitude),
      longitude: data.longitude == null ? "" : String(data.longitude),
      directoryEnabled: Boolean(data.directoryEnabled),
    },
  });
  const group = form.watch("specialtyGroupId");
  const fields: { name: keyof Values; label: string; type?: string }[] = [
    { name: "specialty", label: "Current specialty / description" },
    { name: "hospital", label: "Clinic / facility name" },
    {
      name: "consultationRate",
      label: "Consultation rate (KSh)",
      type: "number",
    },
    { name: "affiliations", label: "Professional affiliations" },
    { name: "practiceAddress", label: "Practice address" },
    { name: "practiceTown", label: "Town" },
    { name: "practiceCounty", label: "County / region" },
    { name: "latitude", label: "Latitude", type: "number" },
    { name: "longitude", label: "Longitude", type: "number" },
    { name: "bio", label: "About your practice", type: "textarea" },
  ];
  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await practiceSend(
                "/api/service-profile/practice",
                {
                  ...values,
                  specialtyGroupId: values.specialtyGroupId || null,
                  specialtyId: values.specialtyId || null,
                  specialtyOther:
                    !values.specialtyId &&
                    values.specialtyGroupId === data.specialtyGroupId
                      ? data.specialtyOther
                      : null,
                  latitude:
                    values.latitude === "" ? null : Number(values.latitude),
                  longitude:
                    values.longitude === "" ? null : Number(values.longitude),
                },
                "PATCH",
              );
              await onSaved();
              toast.success("Practice profile saved");
            } catch (e) {
              toast.error((e as Error).message);
            }
          })}
        >
          <fieldset
            disabled={disabled || form.formState.isSubmitting}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="specialtyGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty group</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-11 w-full rounded-md border bg-background px-3"
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue("specialtyId", "");
                        }}
                      >
                        <option value="">Keep current specialty</option>
                        {specialties
                          ?.filter(
                            (s) => !s.parentId && s.status === "APPROVED",
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialtyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subspecialty</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-11 w-full rounded-md border bg-background px-3"
                        disabled={!group}
                      >
                        <option value="">General</option>
                        {specialties
                          ?.filter(
                            (s) =>
                              s.parentId === group && s.status === "APPROVED",
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {fields.map((def) => (
                <FormField
                  key={def.name}
                  control={form.control}
                  name={def.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{def.label}</FormLabel>
                      <FormControl>
                        {def.type === "textarea" ? (
                          <Textarea {...field} value={String(field.value)} />
                        ) : (
                          <Input
                            {...field}
                            value={String(field.value)}
                            type={def.type || "text"}
                            step={
                              def.name === "latitude" ||
                              def.name === "longitude"
                                ? "any"
                                : undefined
                            }
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={locating}
              onClick={() => {
                if (!navigator.geolocation) {
                  toast.error("Location is unavailable");
                  return;
                }
                setLocating(true);
                navigator.geolocation.getCurrentPosition(
                  (p) => {
                    form.setValue("latitude", String(p.coords.latitude));
                    form.setValue("longitude", String(p.coords.longitude));
                    setLocating(false);
                  },
                  () => {
                    toast.error(
                      "Location could not be obtained. Enter the practice coordinates manually.",
                    );
                    setLocating(false);
                  },
                  { timeout: 10000 },
                );
              }}
            >
              {locating
                ? "Finding location…"
                : "Use current location for this practice"}
            </Button>
            <FormField
              control={form.control}
              name="directoryEnabled"
              render={({ field }) => (
                <FormItem className="rounded-xl bg-primary/5 p-4">
                  <FormControl>
                    <input
                      id="directory-opt-in"
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-3 h-5 w-5 align-middle"
                    />
                  </FormControl>
                  <FormLabel htmlFor="directory-opt-in">
                    Publish my practice and accept appointment requests
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Your name, specialty, bio, clinic, practice address,
                    coordinates and consultation rate will be public. Listing
                    requires reviewed professional licence evidence and active
                    professional membership. Your account contact details and
                    clinical records remain private.
                  </p>
                </FormItem>
              )}
            />
            <Button type="submit">
              {form.formState.isSubmitting
                ? "Saving…"
                : "Save practice profile"}
            </Button>
          </fieldset>
        </form>
      </Form>
      {!disabled && (
        <div className="space-y-3 border-t pt-5">
          <h3 className="font-semibold">Other subspecialty</h3>
          <p className="text-sm text-muted-foreground">
            Choose a group above and suggest a subspecialty. It appears on your
            profile immediately and enters the shared list only after admin
            approval. Save other profile edits before suggesting.
          </p>
          <Label htmlFor="specialty-proposal">Proposed subspecialty</Label>
          <Input
            id="specialty-proposal"
            maxLength={120}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={!group || !proposal.trim() || proposing}
            onClick={async () => {
              setProposing(true);
              try {
                await practiceSend("/api/practice/specialties", {
                  name: proposal,
                  parentId: group,
                });
                await refreshSpecialties();
                await onSaved();
                setProposal("");
                toast.success("Specialty suggestion submitted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setProposing(false);
              }
            }}
          >
            Suggest subspecialty
          </Button>
          {data.specialtyOther && (
            <p role="status" className="text-sm">
              Your suggestion: {data.specialtyOther}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
