"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { MapPin, LocateFixed, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PracticeForm,
  practiceFetch,
  practiceSend,
} from "@/components/hub/practice-form";
import { formatKsh } from "@/lib/hub-finance";
import { toast } from "sonner";

type Specialty = {
  id: string;
  name: string;
  parentId: string | null;
  status: string;
};
type Practitioner = {
  id: string;
  name: string;
  specialty: string;
  clinic: string | null;
  address: string | null;
  town: string | null;
  county: string | null;
  bio: string | null;
  consultationRate: number;
  distance: number | null;
};

export function PractitionerDirectory() {
  const [q, setQ] = useState(""),
    [specialty, setSpecialty] = useState(""),
    [county, setCounty] = useState("");
  const [search, setSearch] = useState({ q: "", county: "" });
  useEffect(() => {
    const timer = setTimeout(() => setSearch({ q, county }), 350);
    return () => clearTimeout(timer);
  }, [q, county]);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [sent, setSent] = useState<string | null>(null);
  const { data: specialties } = useSWR<Specialty[]>(
    "/api/practice/specialties",
    practiceFetch,
  );
  const query = new URLSearchParams({
    q: search.q,
    specialty,
    county: search.county,
    ...(coordinates
      ? {
          latitude: String(coordinates.latitude),
          longitude: String(coordinates.longitude),
        }
      : {}),
  });
  const { data, error } = useSWR<{
    practitioners: Practitioner[];
    truncated: boolean;
  }>(`/api/practice/directory?${query}`, practiceFetch, {
    keepPreviousData: true,
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div>
            <Label htmlFor="doctor-search">Search by name or clinic</Label>
            <Input
              id="doctor-search"
              maxLength={120}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Practitioner or clinic name"
            />
          </div>
          <div>
            <Label htmlFor="doctor-specialty">Specialty</Label>
            <select
              id="doctor-specialty"
              className="h-11 w-full rounded-md border border-input bg-background px-3"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              <option value="">Any specialty</option>
              {specialties
                ?.filter((s) => s.status === "APPROVED")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.parentId ? "— " : ""}
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label htmlFor="doctor-county">County / region</Label>
            <Input
              id="doctor-county"
              maxLength={120}
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="Anywhere"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Button
              variant="outline"
              disabled={locating}
              onClick={() => {
                if (!navigator.geolocation) {
                  toast.error("Location is unavailable on this browser");
                  return;
                }
                setLocating(true);
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setCoordinates({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    });
                    setLocating(false);
                  },
                  () => {
                    toast.error(
                      "Location was unavailable. You can search by county instead.",
                    );
                    setLocating(false);
                  },
                  { timeout: 10000, maximumAge: 60000 },
                );
              }}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              {locating ? "Finding location…" : "Use my location"}
            </Button>
            {coordinates && (
              <Button variant="ghost" onClick={() => setCoordinates(null)}>
                Clear location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        {coordinates
          ? "Practitioners with published coordinates appear nearest first. Distance is approximate."
          : "Share your location to put nearby practitioners first. Location is used for this search only."}
      </p>
      {sent && (
        <p role="status" className="rounded-xl bg-primary/10 p-4">
          {sent}
        </p>
      )}
      {error ? (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      ) : !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {data.practitioners.length} matching practitioners
            {data.truncated
              ? " · Please narrow your search; only the first 500 matches are shown."
              : ""}
          </p>
          {!data.practitioners.length && (
            <Card>
              <CardContent className="py-8">
                No practitioners match these filters. Try another specialty,
                county or clinic name.
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.practitioners.map((p) => (
              <Card key={p.id} className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <p className="inline-flex items-center gap-2 text-sm text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Licence evidence reviewed
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-medium">{p.specialty}</p>
                  {p.clinic && <p>{p.clinic}</p>}
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {[p.address, p.town, p.county].filter(Boolean).join(", ") ||
                      "Location not published"}
                    {p.distance !== null && ` · ${p.distance} km away`}
                  </p>
                  {p.bio && <p className="text-sm">{p.bio}</p>}
                  <p className="text-sm">
                    Consultation from{" "}
                    <strong>{formatKsh(p.consultationRate)}</strong>
                  </p>
                  <Button
                    variant="outline"
                    aria-expanded={selected === p.id}
                    onClick={() => {
                      setSelected(selected === p.id ? null : p.id);
                      setSent(null);
                    }}
                  >
                    {selected === p.id
                      ? "Close request form"
                      : "Request an appointment"}
                  </Button>
                  {selected === p.id && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        This is a request, not a confirmed appointment. Do not
                        include medical details. For urgent care, contact your
                        local emergency service.
                      </p>
                      <PracticeForm
                        fields={[
                          { name: "name", label: "Full name", required: true },
                          {
                            name: "phone",
                            label: "Phone number",
                            type: "tel",
                            required: true,
                          },
                          {
                            name: "email",
                            label: "Email (optional)",
                            type: "email",
                          },
                          {
                            name: "clientCode",
                            label: "PAX client ID (optional)",
                          },
                          {
                            name: "preferredDate",
                            label: "Preferred date (optional)",
                            type: "date",
                          },
                          {
                            name: "reason",
                            label: "Appointment type or preference (optional)",
                            type: "textarea",
                          },
                        ]}
                        submitLabel="Send appointment request"
                        onSubmit={async (values) => {
                          const response = await practiceSend<{
                            message: string;
                          }>(`/api/practice/directory/${p.id}`, {
                            name: values.name,
                            phone: values.phone,
                            email: values.email || null,
                            clientCode: values.clientCode || null,
                            preferredDate: values.preferredDate || null,
                            reason: values.reason || null,
                          });
                          setSelected(null);
                          setSent(response.message);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
