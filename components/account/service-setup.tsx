"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ServiceKey } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { TalentForm } from "@/components/talent/common";
import { ProfileEditor } from "@/components/talent/profile";
import { HiringProfileForm } from "@/components/talent/hiring";
import { InnovationSubmitForm } from "@/components/innovator/innovation-submit-form";
import { EthicalManifesto } from "@/components/investor/ethical-manifesto";
import { InvestorMandate } from "@/components/investor/investor-mandate";
import { VendorOnboardingForm } from "@/components/marketplace/vendor-onboarding-form";
import { BuyerOnboardingForm } from "@/components/marketplace/buyer-onboarding-form";
import { GpsProfile } from "@/components/dashboard/gps-profile";
import { RegulatoryDisclaimer } from "@/components/regulatory-disclaimer";

type SetupInitial = {
  choice: string | null;
  buyer: boolean;
  vendor: boolean;
  career: boolean;
  hiring: boolean;
  community: {
    headline: string;
    organization: string;
    location: string;
    healthAreas: string;
    bio: string;
    linkedinUrl: string;
  };
  practice: {
    medicalRegNumber: string;
    specialty: string;
    hospital: string;
    bio: string;
    affiliations: string;
    consultationRate: number;
  };
};
export function ServiceSetup({
  service,
  initial,
}: {
  service: ServiceKey;
  initial: SetupInitial;
}) {
  const { update } = useSession();
  const [choice, setChoice] = useState(initial.choice || "");
  const [career, setCareer] = useState(initial.career);
  const [hiring, setHiring] = useState(initial.hiring);
  const [manifesto, setManifesto] = useState(false);
  const [destination, setDestination] = useState("");
  const [gps, setGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  async function send(
    action: "begin" | "complete",
    data?: unknown,
    nextChoice?: string,
  ) {
    const response = await fetch(`/api/account/services/${service}/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...(data === undefined ? {} : { data }),
        ...(nextChoice ? { choice: nextChoice } : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save setup");
    return result as { href: string };
  }
  async function finish(data?: unknown) {
    setError("");
    setBusy(true);
    try {
      const result = await send("complete", data);
      await update();
      setDestination(result.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save setup");
      throw err;
    } finally {
      setBusy(false);
    }
  }
  async function begin(nextChoice?: string) {
    setError("");
    setBusy(true);
    try {
      await send("begin", undefined, nextChoice);
      await update();
      setStarted(true);
      if (nextChoice) setChoice(nextChoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start setup");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void begin(); /* Idempotent progress marker; never grants access. */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (destination)
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold">Your setup is saved</h2>
        {service === "practice" && (
          <p>
            Professional membership is required to create an operational
            Practice workspace. Your professional details are saved; staff
            access remains invitation-based.
          </p>
        )}
        {["practice", "talent", "innovation", "community"].includes(
          service,
        ) && (
          <>
            <p>
              Make your experience visible through evidence. Add your first GPS
              entry, or return to it later.
            </p>
            <Button variant="outline" onClick={() => setGps(true)}>
              Add your first GPS entry
            </Button>
            {gps && <GpsProfile />}
            <Button asChild className="ml-2">
              <a href={destination}>
                {gps ? "Continue to service" : "Skip for now — open service"}
              </a>
            </Button>
          </>
        )}
        {!["practice", "talent", "innovation", "community"].includes(
          service,
        ) && (
          <Button asChild>
            <a href={destination}>Open service</a>
          </Button>
        )}
        <p>
          <a className="text-primary underline" href="/account">
            Back to Accounts
          </a>
        </p>
      </div>
    );
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!started ? (
        <Button onClick={() => void begin()} disabled={busy}>
          {busy ? "Preparing setup…" : "Retry setup"}
        </Button>
      ) : (
        <>
          {service === "practice" && (
            <TalentForm
              defaults={initial.practice}
              fields={[
                {
                  name: "medicalRegNumber",
                  label: "Professional registration / licence number",
                  required: true,
                },
                {
                  name: "specialty",
                  label: "Profession / specialty",
                  required: true,
                },
                { name: "hospital", label: "Hospital / facility (optional)" },
                {
                  name: "bio",
                  label: "Professional bio (optional)",
                  type: "textarea",
                },
                { name: "affiliations", label: "Affiliations (optional)" },
                {
                  name: "consultationRate",
                  label: "Consultation rate (KSh)",
                  type: "number",
                },
              ]}
              submitLabel="Save practitioner details"
              onSave={finish}
            />
          )}
          {service === "community" && (
            <>
              <TalentForm
                defaults={initial.community}
                fields={[
                  { name: "headline", label: "Headline (optional)" },
                  { name: "organization", label: "Organisation (optional)" },
                  { name: "location", label: "Location (optional)" },
                  { name: "healthAreas", label: "Health areas (optional)" },
                  {
                    name: "bio",
                    label: "About you (optional)",
                    type: "textarea",
                  },
                  { name: "linkedinUrl", label: "LinkedIn URL (optional)" },
                ]}
                submitLabel="Save and continue"
                onSave={finish}
              />
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void finish(initial.community).catch(() => {})}
              >
                Skip optional details
              </Button>
            </>
          )}
          {service === "innovation" && (
            <InnovationSubmitForm setupSubmit={finish} />
          )}
          {service === "investment" &&
            (manifesto ? (
              <InvestorMandate
                setupSubmit={async (mandate) => {
                  await finish({ manifestoAccepted: true, mandate });
                }}
              />
            ) : (
              <EthicalManifesto
                deferSave
                onAccepted={() => setManifesto(true)}
              />
            ))}
          {service === "talent" && (
            <>
              {!choice ? (
                <fieldset className="space-y-3">
                  <legend className="mb-3 font-semibold">
                    How would you like to use Talent?
                  </legend>
                  {[
                    ["career", "Build my career profile"],
                    ["hiring", "Create a hiring profile"],
                    ["both", "Both career and hiring"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      variant="outline"
                      className="mr-3"
                      disabled={busy}
                      onClick={() => void begin(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </fieldset>
              ) : (
                <>
                  {!career && ["career", "both"].includes(choice) ? (
                    <ProfileEditor
                      onComplete={async () => {
                        setCareer(true);
                        if (choice === "career" || hiring) await finish();
                      }}
                    />
                  ) : !hiring && ["hiring", "both"].includes(choice) ? (
                    <HiringProfileForm
                      onSaved={async () => {
                        setHiring(true);
                        await finish();
                      }}
                    />
                  ) : (
                    <Button
                      disabled={busy}
                      onClick={() => void finish().catch(() => {})}
                    >
                      Continue with existing profiles
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setChoice("")}
                  >
                    Change setup choice
                  </Button>
                </>
              )}
            </>
          )}
          {service === "market" && (
            <>
              {!choice ? (
                <div className="flex flex-wrap gap-3">
                  {[
                    ["browse", "Browse products"],
                    ["buyer", "Register as buyer"],
                    ["vendor", "Register as vendor"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      variant="outline"
                      disabled={busy}
                      onClick={() => void begin(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              ) : choice === "browse" ? (
                <Button
                  disabled={busy}
                  onClick={() => void finish().catch(() => {})}
                >
                  Continue to marketplace
                </Button>
              ) : (choice === "buyer" && initial.buyer) ||
                (choice === "vendor" && initial.vendor) ? (
                <Button
                  disabled={busy}
                  onClick={() => void finish().catch(() => {})}
                >
                  Continue with existing application
                </Button>
              ) : choice === "buyer" ? (
                <BuyerOnboardingForm
                  onComplete={async () => {
                    await finish();
                  }}
                />
              ) : (
                <VendorOnboardingForm
                  onComplete={async () => {
                    await finish();
                  }}
                />
              )}
              {choice && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setChoice("")}
                >
                  Change marketplace choice
                </Button>
              )}
              <RegulatoryDisclaimer />
            </>
          )}
          {service === "safety" && (
            <Button
              disabled={busy}
              onClick={() => void finish().catch(() => {})}
            >
              Continue to reporting
            </Button>
          )}
        </>
      )}
    </div>
  );
}
